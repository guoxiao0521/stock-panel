/** DELETE /api/trades/:id — 删除交易并重算持仓 */
export default defineEventHandler(async (event) => {
  const session = await requireCurrentSession(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: '缺少交易 ID' })
  }

  const watchlistId = await resolveWatchlistId(event, session.user.id)

  try {
    return await removeTrade(watchlistId, id)
  }
  catch (e) {
    if (e instanceof TradeValidationError) {
      const notFound = e.message.includes('未找到')
      throw createError({ statusCode: notFound ? 404 : 400, message: e.message })
    }
    throw e
  }
})
