import type { Candle } from '#shared/types'

export interface MaPoint {
  time: string
  value: number
}

/**
 * 简单移动平均（SMA）。基于收盘价，前 period-1 根因数据不足不产出点位。
 * 注意：MA 仅使用当前区间内的 K 线计算，区间起始处的均线会延后出现。
 */
export function computeSMA(candles: Candle[], period: number): MaPoint[] {
  if (period <= 0 || candles.length < period)
    return []
  const out: MaPoint[] = []
  let sum = 0
  for (let i = 0; i < candles.length; i++) {
    sum += candles[i]!.close
    if (i >= period)
      sum -= candles[i - period]!.close
    if (i >= period - 1)
      out.push({ time: candles[i]!.time, value: sum / period })
  }
  return out
}
