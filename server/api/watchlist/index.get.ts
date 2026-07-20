/** GET /api/watchlist?holdingOnly=true — 获取自选股列表，可仅返回持仓股 */
export default defineEventHandler(async (event) => {
  const rawHoldingOnly = getQuery(event).holdingOnly
  if (rawHoldingOnly !== undefined && rawHoldingOnly !== 'true' && rawHoldingOnly !== 'false') {
    throw createError({ statusCode: 400, message: 'holdingOnly 参数必须为 true 或 false' })
  }

  const holdingOnly = rawHoldingOnly === 'true'
  const watchlistId = await resolveWatchlistId(event)
  const items = await listWatchlistRows(watchlistId, { holdingOnly })
  return {
    watchlistId,
    items,
  }
})
