import type { CreateWatchlistItemBody } from '#shared/types'

/** POST /api/watchlist/items — 添加自选股（需登录；含 yahoo-finance2 校验与首次行情） */
export default defineEventHandler(async (event) => {
  await requireCurrentSession(event)

  const body = await readBody<CreateWatchlistItemBody>(event)

  const raw = (body?.symbol ?? '').trim().toUpperCase()
  if (!raw) {
    throw createError({ statusCode: 400, message: '股票代码不能为空' })
  }
  if (!/^[A-Z.\-]{1,10}$/.test(raw)) {
    throw createError({ statusCode: 400, message: '股票代码格式不正确' })
  }

  const watchlistId = await resolveWatchlistId(event)
  if (await findItemBySymbol(watchlistId, raw)) {
    throw createError({ statusCode: 409, message: `${raw} 已在自选股列表中` })
  }

  // 通过 yahoo-finance2 校验 ticker 是否有效，同时拿到公司信息和首次行情
  let quoteResult
  try {
    quoteResult = await fetchQuote(raw)
  }
  catch {
    throw createError({ statusCode: 404, message: `无法找到美股代码 ${raw}` })
  }

  const item = await createWatchlistItem(watchlistId, {
    symbol: raw,
    name: quoteResult.meta.name,
    exchange: quoteResult.meta.exchange,
    currency: quoteResult.meta.currency,
  })

  await upsertQuoteSnapshot(quoteResult.snapshot, JSON.stringify(quoteResult.raw))

  setResponseStatus(event, 201)
  return { ...item, quote: quoteResult.snapshot }
})
