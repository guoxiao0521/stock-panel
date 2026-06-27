/** GET /api/watchlist — 获取当前用户（或匿名默认）自选股列表及最近行情快照 */
export default defineEventHandler(async (event) => {
  const watchlistId = await resolveWatchlistId(event)
  const items = await listWatchlistRows(watchlistId)
  return {
    watchlistId,
    items,
  }
})
