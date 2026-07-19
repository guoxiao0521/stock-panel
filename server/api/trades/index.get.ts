/** GET /api/trades?symbol= — 列出交易记录与回放汇总 */
export default defineEventHandler(async (event) => {
  const watchlistId = await resolveWatchlistId(event)
  const query = getQuery(event)
  const symbol = typeof query.symbol === 'string' ? query.symbol.trim().toUpperCase() : undefined

  if (symbol && !/^[A-Z.\-]{1,10}$/.test(symbol)) {
    throw createError({ statusCode: 400, message: '股票代码格式不正确' })
  }

  try {
    return await getTradesResponse(watchlistId, symbol)
  }
  catch (e) {
    if (e instanceof TradeValidationError) {
      throw createError({ statusCode: 400, message: e.message })
    }
    throw e
  }
})
