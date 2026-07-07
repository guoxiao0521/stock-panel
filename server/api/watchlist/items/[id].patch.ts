import type { UpdateWatchlistItemBody } from '#shared/types'

/** PATCH /api/watchlist/items/:id — 更新备注、标签、持仓或排序（需登录） */
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

  const body = (await readBody<UpdateWatchlistItemBody | null>(event)) ?? {}
  const patch: UpdateWatchlistItemBody = {}
  if (body.note !== undefined)
    patch.note = body.note
  if (Array.isArray(body.tags))
    patch.tags = body.tags.filter(t => typeof t === 'string')
  if (body.costPrice !== undefined)
    patch.costPrice = parsePositiveNullableNumber(body.costPrice, '成本价')
  if (body.shareCount !== undefined)
    patch.shareCount = parsePositiveNullableNumber(body.shareCount, '持股数')
  if (typeof body.sortOrder === 'number')
    patch.sortOrder = body.sortOrder

  const updated = await updateWatchlistItem(id, patch)
  if (!updated) {
    throw createError({ statusCode: 404, message: '未找到该自选股条目' })
  }
  return updated
})

function parsePositiveNullableNumber(value: unknown, label: string): number | null {
  if (value === null)
    return null
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw createError({ statusCode: 400, message: `${label}必须为大于 0 的数字` })
  }
  return value
}
