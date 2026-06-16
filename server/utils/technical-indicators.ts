import type { AnalysisTechnicalSummary, Candle } from '#shared/types'

function computeSMAAt(candles: Candle[], period: number, endIndex: number): number | null {
  const start = endIndex - period + 1
  if (period <= 0 || start < 0 || endIndex >= candles.length)
    return null
  let sum = 0
  for (let i = start; i <= endIndex; i++)
    sum += candles[i]!.close
  return sum / period
}

function latestSMA(candles: Candle[], period: number): number | null {
  if (candles.length < period)
    return null
  return computeSMAAt(candles, period, candles.length - 1)
}

/** 近 N 个交易日的最高/最低，用于支撑/压力与 52 周区间近似 */
function recentRange(candles: Candle[], days: number): { high: number | null, low: number | null } {
  const slice = candles.slice(-days)
  if (slice.length === 0)
    return { high: null, low: null }
  return {
    high: Math.max(...slice.map(c => c.high)),
    low: Math.min(...slice.map(c => c.low)),
  }
}

/** 从 K 线序列计算分析所需技术指标 */
export function computeTechnicalSummary(
  candles: Candle[],
  dailyVolume: number | null,
): AnalysisTechnicalSummary {
  const price = candles.length > 0 ? candles[candles.length - 1]!.close : null
  const ma50 = latestSMA(candles, 50)
  const ma150 = latestSMA(candles, 150)
  const ma200 = latestSMA(candles, 200)

  const ma200Past = candles.length >= 220
    ? computeSMAAt(candles, 200, candles.length - 21)
    : null
  const ma200Rising = ma200 != null && ma200Past != null
    ? ma200 > ma200Past
    : null

  const yearRange = recentRange(candles, 252)
  const week52High = yearRange.high
  const week52Low = yearRange.low

  const pctFrom52WeekHigh = price != null && week52High != null && week52High > 0
    ? ((price - week52High) / week52High) * 100
    : null
  const pctAbove52WeekLow = price != null && week52Low != null && week52Low > 0
    ? ((price - week52Low) / week52Low) * 100
    : null

  const recent20 = recentRange(candles, 20)
  const supportLevel = recent20.low
  const resistanceLevel = recent20.high

  return {
    price,
    ma50,
    ma150,
    ma200,
    ma200Rising,
    week52High,
    week52Low,
    pctFrom52WeekHigh,
    pctAbove52WeekLow,
    avgVolume20: null,
    volumeRatio: null,
    supportLevel,
    resistanceLevel,
  }
}
