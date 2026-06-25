import type { IntradayPoint, IntradaySeries } from '#shared/types'
import YahooFinance from 'yahoo-finance2'
import { INTRADAY_INDICES } from './macro-config'

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

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

/** 市场本地交易日 yyyy-mm-dd（按 gmtoffset 把 UTC 时间平移到交易所本地） */
function marketLocalDate(date: Date, gmtOffsetSeconds: number): string {
  return new Date(date.getTime() + gmtOffsetSeconds * 1000).toISOString().slice(0, 10)
}

/**
 * 获取单个指数的当日（最近一个交易会话）盘中走势。
 * 取近 5 天 5 分钟线后仅保留最新会话日，跨周末/节假日仍稳健。
 */
export async function fetchIntradaySeries(symbol: string, name: string): Promise<IntradaySeries> {
  const start = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
  const chart = await yf.chart(symbol, { period1: start, interval: '5m', includePrePost: false })
  const meta = chart.meta
  const gmtOffset = num(meta.gmtoffset) ?? 0

  const allPoints: IntradayPoint[] = []
  for (const q of chart.quotes) {
    const value = num(q.close)
    if (value == null || !q.date)
      continue
    allPoints.push({ time: Math.floor(new Date(q.date).getTime() / 1000), value })
  }

  // 仅保留最新会话日的点，避免把多日盘中数据拼成一条曲线
  const lastPoint = allPoints.at(-1)
  const sessionDate = lastPoint
    ? marketLocalDate(new Date(lastPoint.time * 1000), gmtOffset)
    : null
  const points = sessionDate
    ? allPoints.filter(p => marketLocalDate(new Date(p.time * 1000), gmtOffset) === sessionDate)
    : []

  const previousClose = num(meta.previousClose) ?? num(meta.chartPreviousClose)
  const last = points.at(-1)?.value ?? num(meta.regularMarketPrice)
  const change = last != null && previousClose != null ? last - previousClose : null
  const changePercent = change != null && previousClose ? (change / previousClose) * 100 : null

  // chart.meta 不含 marketState，从 currentTradingPeriod.regular 推断（仅用于轮询节奏）
  const regular = meta.currentTradingPeriod?.regular
  const now = Date.now()
  const marketState = regular
    && now >= new Date(regular.start).getTime()
    && now <= new Date(regular.end).getTime()
    ? 'REGULAR'
    : 'CLOSED'

  return {
    symbol,
    name,
    points,
    previousClose,
    last,
    change,
    changePercent,
    currency: meta.currency ?? null,
    marketState,
    gmtOffset,
    sessionDate,
    fetchedAt: new Date().toISOString(),
    error: null,
  }
}

interface CacheEntry {
  data: IntradaySeries
  at: number
}

// 模块级内存缓存：盘中数据不落库，短时缓存抑制 Yahoo 频繁拉取
const cache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 30 * 1000

/**
 * 批量获取主要指数当日走势。单只失败不影响其他：优先回退旧缓存，
 * 无缓存时返回带 error 的占位（对齐宏观指标的容错策略）。
 */
export async function getIntradaySeriesList(): Promise<IntradaySeries[]> {
  const now = Date.now()
  return Promise.all(
    INTRADAY_INDICES.map(async ({ symbol, name }) => {
      const cached = cache.get(symbol)
      if (cached && now - cached.at < CACHE_TTL_MS)
        return cached.data
      try {
        const data = await fetchIntradaySeries(symbol, name)
        cache.set(symbol, { data, at: now })
        return data
      }
      catch (e) {
        const message = e instanceof Error ? e.message : String(e)
        if (cached)
          return { ...cached.data, error: message }
        return {
          symbol,
          name,
          points: [],
          previousClose: null,
          last: null,
          change: null,
          changePercent: null,
          currency: null,
          marketState: null,
          gmtOffset: null,
          sessionDate: null,
          fetchedAt: new Date().toISOString(),
          error: message,
        } satisfies IntradaySeries
      }
    }),
  )
}
