import type { CreateWatchlistItemBody } from '#shared/types'

/** POST /api/watchlist/items — 添加自选股（需登录；含 yahoo-finance2 校验与首次行情） */
export default defineEventHandler(async (event) => {
  const startedAt = Date.now()
  const requestId = Math.random().toString(36).slice(2, 8)
  const log = (stage: string, extra: Record<string, unknown> = {}) => {
    console.info('[watchlist:add]', { requestId, stage, elapsedMs: Date.now() - startedAt, ...extra })
  }

  log('start')
  await requireCurrentSession(event)
  log('session-ok')

  let body: CreateWatchlistItemBody
  try {
    body = await readBody<CreateWatchlistItemBody>(event)
    log('body-read')
  }
  catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    log('body-read-failed', { error: message })
    throw createError({ statusCode: 400, message: '请求内容解析失败' })
  }

  const raw = (body?.symbol ?? '').trim().toUpperCase()
  if (!raw) {
    throw createError({ statusCode: 400, message: '股票代码不能为空' })
  }
  if (!/^[A-Z.\-]{1,10}$/.test(raw)) {
    throw createError({ statusCode: 400, message: '股票代码格式不正确' })
  }
  log('body-ok', { symbol: raw })

  const watchlistId = await resolveWatchlistId(event)
  log('watchlist-resolved')
  if (await findItemBySymbol(watchlistId, raw)) {
    log('duplicate', { symbol: raw })
    throw createError({ statusCode: 409, message: `${raw} 已在自选股列表中` })
  }
  log('duplicate-checked', { symbol: raw })

  // 通过 yahoo-finance2 校验 ticker 是否有效，同时拿到公司信息和首次行情
  let quoteResult
  try {
    quoteResult = await fetchQuote(raw)
    log('quote-fetched', { symbol: raw })
  }
  catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    log('quote-failed', { symbol: raw, error: message })
    if (message.includes('TIMEOUT')) {
      throw createError({ statusCode: 504, message: '行情服务超时，请稍后重试' })
    }
    throw createError({ statusCode: 404, message: `无法找到美股代码 ${raw}` })
  }

  const item = await createWatchlistItem(watchlistId, {
    symbol: raw,
    name: quoteResult.meta.name,
    exchange: quoteResult.meta.exchange,
    currency: quoteResult.meta.currency,
  })
  log('item-created', { symbol: raw })

  await upsertQuoteSnapshot(quoteResult.snapshot, JSON.stringify(quoteResult.raw))
  log('snapshot-upserted', { symbol: raw })

  setResponseStatus(event, 201)
  log('success', { symbol: raw })
  return { ...item, quote: quoteResult.snapshot }
})
