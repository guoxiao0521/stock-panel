import type { HistoryRange } from '#shared/types'
import { HISTORY_RANGES } from '#shared/types'

/** GET /api/quotes/history?symbol=AAPL&range=6M — 个股历史 OHLC（日线） */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const symbol = typeof query.symbol === 'string' ? query.symbol.trim().toUpperCase() : ''
  if (!symbol)
    throw createError({ statusCode: 400, message: '缺少 symbol 参数' })

  const rangeRaw = typeof query.range === 'string' ? query.range.toUpperCase() : '6M'
  const range = (HISTORY_RANGES.includes(rangeRaw as HistoryRange) ? rangeRaw : '6M') as HistoryRange

  try {
    const candles = await fetchHistory(symbol, range)
    return { symbol, range, candles }
  }
  catch {
    throw createError({ statusCode: 502, message: `无法获取 ${symbol} 的历史数据` })
  }
})
