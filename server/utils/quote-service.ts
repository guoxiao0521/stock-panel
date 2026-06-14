import type { QuoteSnapshot } from '#shared/types'
import YahooFinance from 'yahoo-finance2'

// 单例客户端：内置并发队列、抑制问卷提示、关闭 schema 校验抛错
const yf = new YahooFinance({
  suppressNotices: ['yahooSurvey'],
  queue: { concurrency: 4 },
  validation: {
    logErrors: false,
    logOptionsErrors: false,
    allowAdditionalProps: true,
  },
})

export interface QuoteMeta {
  name: string | null
  exchange: string | null
  currency: string | null
}

export interface QuoteResult {
  snapshot: QuoteSnapshot
  meta: QuoteMeta
  raw: unknown
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

/** 年初至今涨跌幅：当年首个可用交易日收盘价对比最新价 */
async function fetchYtd(symbol: string, price: number | null): Promise<number | null> {
  if (price == null)
    return null
  try {
    const start = new Date(new Date().getFullYear(), 0, 1)
    const chart = await yf.chart(symbol, { period1: start, interval: '1d' })
    const firstClose = chart.quotes.find(q => q.close != null)?.close ?? null
    if (firstClose == null || firstClose === 0)
      return null
    return ((price - firstClose) / firstClose) * 100
  }
  catch {
    return null
  }
}

/** 流通股本（best-effort），用于换手率优先项 */
async function fetchFloatShares(symbol: string): Promise<number | null> {
  try {
    const summary = await yf.quoteSummary(symbol, { modules: ['defaultKeyStatistics'] })
    return num(summary.defaultKeyStatistics?.floatShares)
  }
  catch {
    return null
  }
}

/** 校验并获取单只股票的行情快照，无效 ticker 会抛错 */
export async function fetchQuote(symbol: string): Promise<QuoteResult> {
  const sym = symbol.trim().toUpperCase()
  const q = await yf.quote(sym)
  if (!q || !q.symbol)
    throw new Error('SYMBOL_NOT_FOUND')

  const price = num(q.regularMarketPrice)
  const volume = num(q.regularMarketVolume)

  const [ytd, floatShares] = await Promise.all([
    fetchYtd(sym, price),
    fetchFloatShares(sym),
  ])

  // 换手率：优先 floatShares，否则 sharesOutstanding
  const shares = floatShares ?? num(q.sharesOutstanding)
  const turnoverRate = volume != null && shares != null && shares > 0
    ? (volume / shares) * 100
    : null

  const now = new Date().toISOString()
  const snapshot: QuoteSnapshot = {
    symbol: sym,
    price,
    change: num(q.regularMarketChange),
    changePercent: num(q.regularMarketChangePercent),
    ytdChangePercent: ytd,
    volume,
    turnoverRate,
    trailingPe: num(q.trailingPE),
    forwardPe: num(q.forwardPE),
    marketCap: num(q.marketCap),
    quoteTime: q.regularMarketTime ? new Date(q.regularMarketTime).toISOString() : null,
    fetchedAt: now,
    source: 'yahoo-finance2',
    error: null,
  }
  const meta: QuoteMeta = {
    name: q.longName ?? q.shortName ?? null,
    exchange: q.fullExchangeName ?? q.exchange ?? null,
    currency: q.currency ?? null,
  }
  return { snapshot, meta, raw: q }
}

/**
 * 批量获取行情，单只失败不影响其他（PRD 14）。
 * 失败的 symbol 返回带 error 的占位快照。
 */
export async function fetchQuotes(symbols: string[]): Promise<QuoteResult[]> {
  return Promise.all(
    symbols.map(async (symbol) => {
      try {
        return await fetchQuote(symbol)
      }
      catch (e) {
        const message = e instanceof Error ? e.message : String(e)
        const sym = symbol.trim().toUpperCase()
        const snapshot: QuoteSnapshot = {
          symbol: sym,
          price: null,
          change: null,
          changePercent: null,
          ytdChangePercent: null,
          volume: null,
          turnoverRate: null,
          trailingPe: null,
          forwardPe: null,
          marketCap: null,
          quoteTime: null,
          fetchedAt: new Date().toISOString(),
          source: 'yahoo-finance2',
          error: message,
        }
        return { snapshot, meta: { name: null, exchange: null, currency: null }, raw: null }
      }
    }),
  )
}
