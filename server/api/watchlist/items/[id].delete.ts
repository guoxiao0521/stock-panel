/** DELETE /api/watchlist/items/:id — 删除自选股（需登录） */
export default defineEventHandler(async (event) => {
  await requireCurrentSession(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: '缺少条目 ID' })
  }

  const watchlistId = await resolveWatchlistId(event)
  const existing = findItemById(id)
  if (!existing || existing.watchlistId !== watchlistId) {
    throw createError({ statusCode: 404, message: '未找到该自选股条目' })
  }

  const ok = deleteWatchlistItem(id)
  if (!ok) {
    throw createError({ statusCode: 404, message: '未找到该自选股条目' })
  }
  return { success: true }
})
