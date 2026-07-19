import type {
  CreateTradeBody,
  SymbolTradeSummary,
  TradeRecord,
  TradeSummary,
  TradeWithPnl,
  TradesResponse,
} from '#shared/types'

const EPSILON = 1e-9

export class TradeValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TradeValidationError'
  }
}

interface ReplayState {
  shareCount: number
  avgCost: number | null
  realizedPnl: number
  totalFees: number
  totalBuyAmount: number
  totalSellAmount: number
}

function emptyState(): ReplayState {
  return {
    shareCount: 0,
    avgCost: null,
    realizedPnl: 0,
    totalFees: 0,
    totalBuyAmount: 0,
    totalSellAmount: 0,
  }
}

function toSummary(state: ReplayState): TradeSummary {
  return {
    shareCount: state.shareCount,
    avgCost: state.avgCost,
    realizedPnl: state.realizedPnl,
    totalFees: state.totalFees,
    totalBuyAmount: state.totalBuyAmount,
    totalSellAmount: state.totalSellAmount,
  }
}

/**
 * 按 traded_at 顺序回放交易（调用方需保证已排序）。
 * 买入手续费计入平均成本；卖出盈亏 = (卖价 − 平均成本) × 数量 − 卖出手续费。
 */
export function replayTrades(trades: TradeRecord[]): {
  trades: TradeWithPnl[]
  summary: TradeSummary
} {
  const state = emptyState()
  const withPnl: TradeWithPnl[] = []

  for (const trade of trades) {
    const fee = Math.max(0, trade.fee)
    state.totalFees += fee

    if (trade.side === 'buy') {
      const buyAmount = trade.price * trade.quantity
      state.totalBuyAmount += buyAmount
      const prevShares = state.shareCount
      const prevCost = state.avgCost ?? 0
      const nextShares = prevShares + trade.quantity
      state.avgCost = nextShares > EPSILON
        ? (prevCost * prevShares + buyAmount + fee) / nextShares
        : null
      state.shareCount = nextShares
      withPnl.push({ ...trade, realizedPnl: null })
      continue
    }

    if (trade.quantity - state.shareCount > EPSILON) {
      throw new TradeValidationError(
        `卖出数量 ${trade.quantity} 超过当时持仓 ${state.shareCount}`,
      )
    }

    const sellAmount = trade.price * trade.quantity
    state.totalSellAmount += sellAmount
    const avgCost = state.avgCost ?? 0
    const tradePnl = (trade.price - avgCost) * trade.quantity - fee
    state.realizedPnl += tradePnl
    state.shareCount = Math.max(0, state.shareCount - trade.quantity)
    if (state.shareCount <= EPSILON) {
      state.shareCount = 0
      state.avgCost = null
    }
    withPnl.push({ ...trade, realizedPnl: tradePnl })
  }

  return { trades: withPnl, summary: toSummary(state) }
}

function groupBySymbol(trades: TradeRecord[]): Map<string, TradeRecord[]> {
  const map = new Map<string, TradeRecord[]>()
  for (const trade of trades) {
    const list = map.get(trade.symbol) ?? []
    list.push(trade)
    map.set(trade.symbol, list)
  }
  return map
}

export function buildTradesResponse(trades: TradeRecord[], symbol?: string): TradesResponse {
  const bySymbolMap = groupBySymbol(trades)
  const bySymbol: SymbolTradeSummary[] = []
  const allWithPnl: TradeWithPnl[] = []

  for (const [sym, list] of [...bySymbolMap.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const replayed = replayTrades(list)
    bySymbol.push({ symbol: sym, ...replayed.summary })
    allWithPnl.push(...replayed.trades)
  }

  allWithPnl.sort((a, b) => {
    const byTime = a.tradedAt.localeCompare(b.tradedAt)
    if (byTime !== 0)
      return byTime
    return a.createdAt.localeCompare(b.createdAt)
  })

  if (symbol) {
    const upper = symbol.toUpperCase()
    const found = bySymbol.find(s => s.symbol === upper)
    return {
      trades: allWithPnl.filter(t => t.symbol === upper),
      summary: found
        ? {
            shareCount: found.shareCount,
            avgCost: found.avgCost,
            realizedPnl: found.realizedPnl,
            totalFees: found.totalFees,
            totalBuyAmount: found.totalBuyAmount,
            totalSellAmount: found.totalSellAmount,
          }
        : {
            shareCount: 0,
            avgCost: null,
            realizedPnl: 0,
            totalFees: 0,
            totalBuyAmount: 0,
            totalSellAmount: 0,
          },
      bySymbol,
    }
  }

  return {
    trades: allWithPnl,
    summary: null,
    bySymbol,
  }
}

async function syncHoldingFromSummary(
  watchlistId: string,
  symbol: string,
  summary: TradeSummary,
): Promise<void> {
  const item = await findItemBySymbol(watchlistId, symbol)
  if (!item)
    return

  const shareCount = summary.shareCount > EPSILON ? summary.shareCount : null
  const costPrice = shareCount != null && summary.avgCost != null && summary.avgCost > 0
    ? summary.avgCost
    : null

  await updateWatchlistItem(item.id, { costPrice, shareCount })
}

function normalizeTradedAt(value: string | undefined): string {
  if (!value?.trim())
    return new Date().toISOString()

  const trimmed = value.trim()
  // date-only input: treat as UTC noon to keep date stable across timezones
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed))
    return `${trimmed}T12:00:00.000Z`

  const date = new Date(trimmed)
  if (Number.isNaN(date.getTime()))
    throw new TradeValidationError('交易时间格式不正确')
  return date.toISOString()
}

export async function getTradesResponse(
  watchlistId: string,
  symbol?: string,
): Promise<TradesResponse> {
  const trades = await listTrades(watchlistId, symbol)
  return buildTradesResponse(trades, symbol)
}

export async function recordTrade(
  watchlistId: string,
  body: CreateTradeBody,
): Promise<TradesResponse> {
  const symbol = body.symbol.trim().toUpperCase()
  if (!symbol)
    throw new TradeValidationError('股票代码不能为空')
  if (!/^[A-Z.\-]{1,10}$/.test(symbol))
    throw new TradeValidationError('股票代码格式不正确')
  if (body.side !== 'buy' && body.side !== 'sell')
    throw new TradeValidationError('交易方向必须为买入或卖出')
  if (typeof body.quantity !== 'number' || !Number.isFinite(body.quantity) || body.quantity <= 0)
    throw new TradeValidationError('数量必须为大于 0 的数字')
  if (typeof body.price !== 'number' || !Number.isFinite(body.price) || body.price < 0)
    throw new TradeValidationError('价格不能为负数')
  const fee = body.fee ?? 0
  if (typeof fee !== 'number' || !Number.isFinite(fee) || fee < 0)
    throw new TradeValidationError('手续费不能为负数')

  const item = await findItemBySymbol(watchlistId, symbol)
  if (!item)
    throw new TradeValidationError(`${symbol} 不在自选股列表中`)

  const tradedAt = normalizeTradedAt(body.tradedAt)
  const existing = await listTrades(watchlistId, symbol)
  const now = new Date().toISOString()
  const candidate: TradeRecord = {
    id: 'pending',
    watchlistId,
    symbol,
    side: body.side,
    quantity: body.quantity,
    price: body.price,
    fee,
    tradedAt,
    createdAt: now,
    updatedAt: now,
  }

  const sorted = [...existing, candidate].sort((a, b) => {
    const byTime = a.tradedAt.localeCompare(b.tradedAt)
    if (byTime !== 0)
      return byTime
    return a.createdAt.localeCompare(b.createdAt)
  })

  // 先回放校验（含新交易），再落库
  try {
    replayTrades(sorted)
  }
  catch (e) {
    if (
      e instanceof TradeValidationError
      && body.side === 'sell'
      && existing.length === 0
      && item.shareCount != null
      && item.shareCount > 0
    ) {
      throw new TradeValidationError(
        `交易账本尚无买入记录，无法卖出。请先补录买入（当前手动持仓 ${item.shareCount} 股${item.costPrice != null ? `，成本 ${item.costPrice}` : ''}），或点击「将当前持仓记为期初买入」。`,
      )
    }
    throw e
  }

  try {
    await insertTrade(watchlistId, {
      symbol,
      side: body.side,
      quantity: body.quantity,
      price: body.price,
      fee,
      tradedAt,
    })
  }
  catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    if (message.includes('does not exist') || message.includes('不存在')) {
      throw new TradeValidationError(
        '交易表尚未创建，请先在数据库执行 supabase/migrations/20260717234500_add_trades.sql',
      )
    }
    throw e
  }

  const refreshed = await listTrades(watchlistId, symbol)
  const response = buildTradesResponse(refreshed, symbol)
  if (response.summary)
    await syncHoldingFromSummary(watchlistId, symbol, response.summary)

  return response
}

export async function removeTrade(
  watchlistId: string,
  tradeId: string,
): Promise<TradesResponse> {
  const existing = await findTradeById(tradeId)
  if (!existing || existing.watchlistId !== watchlistId)
    throw new TradeValidationError('未找到该交易记录')

  const remaining = (await listTrades(watchlistId, existing.symbol))
    .filter(t => t.id !== tradeId)

  // 删除后若回放非法则拒绝（例如删掉买入后卖出超持仓）
  replayTrades(remaining)

  const deleted = await deleteTrade(tradeId)
  if (!deleted)
    throw new TradeValidationError('未找到该交易记录')

  const refreshed = await listTrades(watchlistId, existing.symbol)
  const response = buildTradesResponse(refreshed, existing.symbol)
  if (response.summary)
    await syncHoldingFromSummary(watchlistId, existing.symbol, response.summary)
  else
    await syncHoldingFromSummary(watchlistId, existing.symbol, {
      shareCount: 0,
      avgCost: null,
      realizedPnl: 0,
      totalFees: 0,
      totalBuyAmount: 0,
      totalSellAmount: 0,
    })

  return response
}
