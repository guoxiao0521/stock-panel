/** DELETE /api/watchlist/items/:id — 删除自选股 */
export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: '缺少条目 ID' })
  }

  const ok = deleteWatchlistItem(id)
  if (!ok) {
    throw createError({ statusCode: 404, message: '未找到该自选股条目' })
  }
  return { success: true }
})
