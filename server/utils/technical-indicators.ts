import type { AnalysisTechnicalSummary, Candle } from '#shared/types'

interface SupportCluster {
  names: string[]
  values: number[]
}

interface PriceTouch {
  kind: 'low' | 'close'
  value: number
}

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

function latestVolume(candles: Candle[]): number | null {
  for (let i = candles.length - 1; i >= 0; i--) {
    const volume = candles[i]!.volume
    if (volume != null && volume > 0)
      return volume
  }
  return null
}

function averageRecentVolume(candles: Candle[], days: number): number | null {
  const volumes = candles
    .slice(-days)
    .map(c => c.volume)
    .filter((v): v is number => v != null && v > 0)
  if (volumes.length < days)
    return null
  return volumes.reduce((sum, v) => sum + v, 0) / volumes.length
}

function averageTrueRange(candles: Candle[], days: number): number | null {
  if (candles.length < 2)
    return null
  const slice = candles.slice(-days)
  if (slice.length < 2)
    return null
  const ranges: number[] = []
  for (let i = 0; i < slice.length; i++) {
    const candle = slice[i]!
    const previous = i === 0
      ? candles[candles.length - slice.length - 1]
      : slice[i - 1]
    const trueRange = previous
      ? Math.max(
          candle.high - candle.low,
          Math.abs(candle.high - previous.close),
          Math.abs(candle.low - previous.close),
        )
      : candle.high - candle.low
    ranges.push(trueRange)
  }
  return ranges.reduce((sum, v) => sum + v, 0) / ranges.length
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

function fmtLevel(v: number): string {
  return v.toFixed(2)
}

function levelLabel(index: number): string {
  if (index === 0)
    return '近端支撑 S1'
  if (index === 1)
    return '重要支撑 S2'
  return '中期支撑 S3'
}

function clusterWouldExceedSpan(values: number[], nextValue: number, threshold: number): boolean {
  const high = Math.max(...values, nextValue)
  const low = Math.min(...values, nextValue)
  return high - low > threshold
}

function clusterMovingAverages(
  entries: { name: string, value: number | null }[],
  price: number,
  threshold: number,
): SupportCluster[] {
  const lowerBound = price * 0.75
  const candidates = entries
    .filter((entry): entry is { name: string, value: number } =>
      entry.value != null && entry.value <= price && entry.value >= lowerBound)
    .sort((a, b) => b.value - a.value)

  const clusters: SupportCluster[] = []
  for (const candidate of candidates) {
    const last = clusters[clusters.length - 1]
    const lastValue = last?.values[last.values.length - 1]
    if (
      last
      && lastValue != null
      && Math.abs(lastValue - candidate.value) <= threshold
      && !clusterWouldExceedSpan(last.values, candidate.value, threshold)
    ) {
      last.names.push(candidate.name)
      last.values.push(candidate.value)
    }
    else {
      clusters.push({ names: [candidate.name], values: [candidate.value] })
    }
  }
  return clusters
}

function recentSupportPrices(candles: Candle[], days: number): number[] {
  return candles
    .slice(-days)
    .flatMap(c => [c.low, c.close])
    .filter(v => Number.isFinite(v))
}

function nearbySupportPricesBelow(anchor: number, prices: number[], threshold: number): number[] {
  return prices.filter(v => v <= anchor && anchor - v <= threshold)
}

function distinctSorted(values: number[], minDistance: number): number[] {
  return values
    .sort((a, b) => b - a)
    .reduce<number[]>((out, value) => {
      if (!out.some(existing => Math.abs(existing - value) < minDistance))
        out.push(value)
      return out
    }, [])
}

function clusterPriceTouches(touches: PriceTouch[], threshold: number): PriceTouch[][] {
  const sorted = [...touches].sort((a, b) => b.value - a.value)
  const clusters: PriceTouch[][] = []
  for (const touch of sorted) {
    const last = clusters[clusters.length - 1]
    const lastValue = last?.[last.length - 1]?.value
    const lastValues = last?.map(item => item.value) ?? []
    if (
      last
      && lastValue != null
      && Math.abs(lastValue - touch.value) <= threshold
      && !clusterWouldExceedSpan(lastValues, touch.value, threshold)
    )
      last.push(touch)
    else
      clusters.push([touch])
  }
  return clusters
}

function priceActionSupportLevel(
  candles: Candle[],
  price: number,
  atr14: number | null,
  entries: { name: string, value: number | null }[],
  index: number,
) {
  const zoneDepth = Math.max(price * 0.06, (atr14 ?? 0) * 1.1)
  const clusterThreshold = Math.max(price * 0.02, (atr14 ?? 0) * 0.5)
  const lowerBound = price - zoneDepth
  const recentCandles = candles.slice(-20)
  const touches = recentCandles
    .flatMap<PriceTouch>((c, index) => {
      const isLatest = index === recentCandles.length - 1
      return isLatest
        ? [{ kind: 'low', value: c.low }]
        : [
            { kind: 'low', value: c.low },
            { kind: 'close', value: c.close },
          ]
    })
    .filter(t => t.value <= price && t.value >= lowerBound)

  const cluster = clusterPriceTouches(touches, clusterThreshold)
    .filter(group => group.length >= 3)
    .sort((a, b) => Math.max(...b.map(t => t.value)) - Math.max(...a.map(t => t.value)))[0]
  if (!cluster)
    return null

  const clusterValues = cluster.map(t => t.value)
  const rawHigh = Math.max(...clusterValues)
  const maCap = entries
    .filter((entry): entry is { name: string, value: number } =>
      entry.value != null && entry.value <= price && entry.value >= lowerBound && entry.value <= rawHigh + clusterThreshold)
    .sort((a, b) => b.value - a.value)[0]
  const rangeHigh = Math.max(rawHigh, maCap?.value ?? rawHigh)
  const closes = cluster
    .filter(t => t.kind === 'close' && t.value <= rangeHigh)
    .map(t => t.value)
  const priceActionLow = Math.min(...(closes.length > 0 ? closes : clusterValues))
  const rangeLow = Math.min(priceActionLow, maCap?.value ?? priceActionLow)
  const maBasis = maCap ? `；${maCap.name} ${fmtLevel(maCap.value)} 附近提供均线参考` : ''

  return {
    label: levelLabel(index),
    price: rangeHigh,
    rangeLow,
    rangeHigh,
    basis: `近 20 日低点/收盘在 ${fmtLevel(rangeLow)}-${fmtLevel(rangeHigh)} 区间反复交易${maBasis}`,
  }
}

function buildTechnicalSupportLevels(
  candles: Candle[],
  price: number | null,
  entries: { name: string, value: number | null }[],
) {
  if (price == null || candles.length < 5)
    return []

  const atr14 = averageTrueRange(candles, 14)
  const clusterThreshold = Math.max(price * 0.025, (atr14 ?? 0) * 0.5)
  const nearbyPrices = recentSupportPrices(candles, 20)

  const priceActionLevel = priceActionSupportLevel(candles, price, atr14, entries, 0)
  const levels = priceActionLevel ? [priceActionLevel] : []
  const movingAverageLimit = levels.length > 0
    ? Math.min(...levels.map(level => level.rangeLow)) - clusterThreshold * 0.5
    : price

  levels.push(...clusterMovingAverages(entries, movingAverageLimit, clusterThreshold)
    .slice(0, 3)
    .map((cluster, index) => {
      const anchor = Math.max(...cluster.values)
      const maLow = Math.min(...cluster.values)
      const nearby = nearbySupportPricesBelow(anchor, nearbyPrices, clusterThreshold)
      const rangeLow = Math.min(maLow, ...(nearby.length > 0 ? nearby : [maLow]))
      const rangeHigh = anchor
      const names = cluster.names.join('/')
      const basis = `${names} ${fmtLevel(anchor)}；近 20 日低点/收盘在 ${fmtLevel(rangeLow)}-${fmtLevel(rangeHigh)} 区间提供参考`
      return {
        label: levelLabel(levels.length + index),
        price: anchor,
        rangeLow,
        rangeHigh,
        basis,
      }
    }))

  if (levels.length >= 3)
    return levels.slice(0, 3)

  const lowestExisting = levels.length > 0
    ? Math.min(...levels.map(level => level.rangeLow))
    : price
  const swingAnchors = distinctSorted(
    candles
      .slice(-20)
      .map(c => c.low)
      .filter(v => v < lowestExisting - clusterThreshold * 0.5 && v >= price * 0.75),
    clusterThreshold,
  )

  for (const anchor of swingAnchors) {
    if (levels.length >= 3)
      break
    const nearby = nearbySupportPricesBelow(anchor, nearbyPrices, clusterThreshold)
    const rangeLow = Math.min(anchor, ...(nearby.length > 0 ? nearby : [anchor]))
    levels.push({
      label: levelLabel(levels.length),
      price: anchor,
      rangeLow,
      rangeHigh: anchor,
      basis: `近 20 日低点/收盘在 ${fmtLevel(rangeLow)}-${fmtLevel(anchor)} 区间形成下方支撑参考`,
    })
  }

  return levels
}

/** 从 K 线序列计算分析所需技术指标 */
export function computeTechnicalSummary(
  candles: Candle[],
  dailyVolume: number | null,
): AnalysisTechnicalSummary {
  const price = candles.length > 0 ? candles[candles.length - 1]!.close : null
  const ma5 = latestSMA(candles, 5)
  const ma10 = latestSMA(candles, 10)
  const ma20 = latestSMA(candles, 20)
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
  const resistanceLevel = recent20.high
  const supportLevels = buildTechnicalSupportLevels(candles, price, [
    { name: 'MA5', value: ma5 },
    { name: 'MA10', value: ma10 },
    { name: 'MA20', value: ma20 },
    { name: 'MA50', value: ma50 },
    { name: 'MA150', value: ma150 },
    { name: 'MA200', value: ma200 },
  ])
  const supportLevel = supportLevels[0]?.price ?? null
  const avgVolume20 = averageRecentVolume(candles, 20)
  const comparisonVolume = dailyVolume != null && dailyVolume > 0
    ? dailyVolume
    : latestVolume(candles)
  const volumeRatio = avgVolume20 != null && comparisonVolume != null && avgVolume20 > 0
    ? comparisonVolume / avgVolume20
    : null

  return {
    price,
    ma5,
    ma10,
    ma20,
    ma50,
    ma150,
    ma200,
    ma200Rising,
    week52High,
    week52Low,
    pctFrom52WeekHigh,
    pctAbove52WeekLow,
    avgVolume20,
    volumeRatio,
    supportLevel,
    supportLevels,
    resistanceLevel,
  }
}
