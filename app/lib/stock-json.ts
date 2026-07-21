// 持仓数据 JSON 导出：供「复制到剪贴板」功能生成可喂给 AI 的原始数据结构
import type { WatchlistRow } from '#shared/types'
import { calculateHoldingMetrics, calculatePortfolioHoldingSummary, resolveHoldingCurrency, type PortfolioHoldingSummary } from '@/lib/holding'

/** 单只持仓的导出结构：原始数值 + currency 字段，不做展示层格式化 */
export interface HoldingExport {
  symbol: string
  name: string | null
  exchange: string | null
  currency: string
  shareCount: number | null
  costPrice: number | null
  price: number | null
  costBasis: number | null
  marketValue: number | null
  unrealizedPnl: number | null
  unrealizedPnlPercent: number | null
  change: number | null
  changePercent: number | null
  ytdChangePercent: number | null
  trailingPe: number | null
  forwardPe: number | null
  marketCap: number | null
  volume: number | null
  turnoverRate: number | null
  navPrice: number | null
  premiumDiscountPercent: number | null
  note: string | null
  tags: string[]
  quoteTime: string | null
  fetchedAt: string | null
}

export interface HoldingsExport {
  exportedAt: string
  holdingsCount: number
  summary: PortfolioHoldingSummary
  holdings: HoldingExport[]
}

/** 判定是否为当前持有（持股数大于 0 的有限数），与 holding.ts 内部口径保持一致 */
export function isHeld(row: WatchlistRow | null | undefined): boolean {
  const shareCount = row?.shareCount
  return shareCount != null && Number.isFinite(shareCount) && shareCount > 0
}

export function serializeHolding(row: WatchlistRow): HoldingExport {
  const quote = row.quote
  const metrics = calculateHoldingMetrics(row)

  return {
    symbol: row.symbol,
    name: row.name,
    exchange: row.exchange,
    currency: resolveHoldingCurrency(row),
    shareCount: row.shareCount,
    costPrice: row.costPrice,
    price: quote?.price ?? null,
    costBasis: metrics.costBasis,
    marketValue: metrics.marketValue,
    unrealizedPnl: metrics.unrealizedPnl,
    unrealizedPnlPercent: metrics.unrealizedPnlPercent,
    change: quote?.change ?? null,
    changePercent: quote?.changePercent ?? null,
    ytdChangePercent: quote?.ytdChangePercent ?? null,
    trailingPe: quote?.trailingPe ?? null,
    forwardPe: quote?.forwardPe ?? null,
    marketCap: quote?.marketCap ?? null,
    volume: quote?.volume ?? null,
    turnoverRate: quote?.turnoverRate ?? null,
    navPrice: quote?.navPrice ?? null,
    premiumDiscountPercent: quote?.premiumDiscountPercent ?? null,
    note: row.note,
    tags: row.tags,
    quoteTime: quote?.quoteTime ?? null,
    fetchedAt: quote?.fetchedAt ?? null,
  }
}

/** 仅导出当前持有（有持股数）的自选股，附带导出时间与组合汇总 */
export function serializeHoldingsExport(rows: WatchlistRow[]): HoldingsExport {
  const held = rows.filter(isHeld)

  return {
    exportedAt: new Date().toISOString(),
    holdingsCount: held.length,
    summary: calculatePortfolioHoldingSummary(held),
    holdings: held.map(serializeHolding),
  }
}
