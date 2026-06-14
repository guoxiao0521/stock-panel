import type { MacroMetricSnapshot } from '#shared/types'
import YahooFinance from 'yahoo-finance2'
import { macroName } from './macro-config'

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

export interface MacroResult {
  snapshot: MacroMetricSnapshot
  raw: unknown
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

/** 近 5 个交易日收盘价，用于短期趋势 sparkline */
async function fetchSpark(symbol: string): Promise<number[] | null> {
  try {
    // 取近 10 个自然日以确保覆盖 5 个交易日
    const start = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
    const chart = await yf.chart(symbol, { period1: start, interval: '1d' })
    const closes = chart.quotes
      .map(q => num(q.close))
      .filter((v): v is number => v != null)
    if (closes.length === 0)
      return null
    return closes.slice(-5)
  }
  catch {
    return null
  }
}

/** 获取单个宏观指标快照，无效 symbol 会抛错 */
export async function fetchMacroMetric(symbol: string): Promise<MacroResult> {
  const q = await yf.quote(symbol)
  if (!q || !q.symbol)
    throw new Error('SYMBOL_NOT_FOUND')

  const spark = await fetchSpark(symbol)
  const now = new Date().toISOString()
  const snapshot: MacroMetricSnapshot = {
    symbol,
    name: q.shortName ?? q.longName ?? macroName(symbol),
    value: num(q.regularMarketPrice),
    change: num(q.regularMarketChange),
    changePercent: num(q.regularMarketChangePercent),
    spark,
    quoteTime: q.regularMarketTime ? new Date(q.regularMarketTime).toISOString() : null,
    fetchedAt: now,
    error: null,
    errorAt: null,
  }
  return { snapshot, raw: q }
}

/**
 * 批量获取宏观指标，单只失败不影响其他（PRD 14）。
 * 失败的 symbol 返回带 error 的占位快照。
 */
export async function fetchMacroMetrics(symbols: string[]): Promise<MacroResult[]> {
  return Promise.all(
    symbols.map(async (symbol) => {
      try {
        return await fetchMacroMetric(symbol)
      }
      catch (e) {
        const message = e instanceof Error ? e.message : String(e)
        const snapshot: MacroMetricSnapshot = {
          symbol,
          name: macroName(symbol),
          value: null,
          change: null,
          changePercent: null,
          spark: null,
          quoteTime: null,
          fetchedAt: null,
          error: message,
          errorAt: new Date().toISOString(),
        }
        return { snapshot, raw: null }
      }
    }),
  )
}
