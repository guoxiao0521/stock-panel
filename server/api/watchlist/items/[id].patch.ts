import type { UpdateWatchlistItemBody } from '#shared/types'

/** PATCH /api/watchlist/items/:id — 更新备注、标签或排序（需登录） */
export default defineEventHandler(async (event) => {
  await requireCurrentSession(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: '缺少条目 ID' })
  }

  const watchlistId = await resolveWatchlistId(event)
  const existing = await findItemById(id)
  if (!existing || existing.watchlistId !== watchlistId) {
    throw createError({ statusCode: 404, message: '未找到该自选股条目' })
  }

  const body = await readBody<UpdateWatchlistItemBody>(event)
  const patch: UpdateWatchlistItemBody = {}
  if (body.note !== undefined)
    patch.note = body.note
  if (Array.isArray(body.tags))
    patch.tags = body.tags.filter(t => typeof t === 'string')
  if (typeof body.sortOrder === 'number')
    patch.sortOrder = body.sortOrder

  const updated = await updateWatchlistItem(id, patch)
  if (!updated) {
    throw createError({ statusCode: 404, message: '未找到该自选股条目' })
  }
  return updated
})
