import type { CreateTradeBody } from '#shared/types'

/** POST /api/trades — 新增买入/卖出交易并同步持仓 */
export default defineEventHandler(async (event) => {
  const session = await requireCurrentSession(event)

  let body: CreateTradeBody
  try {
    body = await readBody<CreateTradeBody>(event)
  }
  catch {
    throw createError({ statusCode: 400, message: '请求内容解析失败' })
  }

  const watchlistId = await resolveWatchlistId(event, session.user.id)

  try {
    const result = await recordTrade(watchlistId, body ?? ({} as CreateTradeBody))
    setResponseStatus(event, 201)
    return result
  }
  catch (e) {
    if (e instanceof TradeValidationError) {
      throw createError({ statusCode: 400, statusMessage: e.message, message: e.message })
    }
    const message = e instanceof Error ? e.message : String(e)
    if (message.includes('does not exist')) {
      throw createError({
        statusCode: 500,
        statusMessage: '交易表尚未创建，请执行 trades 迁移',
        message: '交易表尚未创建，请执行 trades 迁移',
      })
    }
    throw e
  }
})
