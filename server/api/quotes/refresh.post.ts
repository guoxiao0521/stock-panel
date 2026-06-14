import { DEFAULT_WATCHLIST_ID } from '../../utils/db'

interface RefreshBody {
  symbols?: string[]
  force?: boolean
}

// 默认缓存有效期 5 分钟（PRD 10.2）
const CACHE_TTL_MS = 5 * 60 * 1000

/** POST /api/quotes/refresh — 刷新一个或多个股票行情 */
export default defineEventHandler(async (event) => {
  const body = await readBody<RefreshBody>(event).catch(() => ({} as RefreshBody))

  const requested = (Array.isArray(body?.symbols) && body.symbols.length > 0
    ? body.symbols
    : listWatchlistSymbols(DEFAULT_WATCHLIST_ID))
    .map(s => s.trim().toUpperCase())
    .filter(Boolean)

  if (requested.length === 0)
    return { snapshots: [], refreshed: [] }

  const force = body?.force === true
  const cached = new Map(getQuoteSnapshots(requested).map(q => [q.symbol, q]))
  const now = Date.now()

  // 仅刷新缺失或已过期的快照（手动刷新 force 时全部刷新）
  const toFetch = requested.filter((symbol) => {
    if (force)
      return true
    const snap = cached.get(symbol)
    if (!snap || !snap.fetchedAt || snap.error)
      return true
    return now - new Date(snap.fetchedAt).getTime() > CACHE_TTL_MS
  })

  if (toFetch.length > 0) {
    const results = await fetchQuotes(toFetch)
    for (const result of results) {
      if (result.snapshot.error === null) {
        upsertQuoteSnapshot(result.snapshot, result.raw ? JSON.stringify(result.raw) : null)
        backfillItemMeta(DEFAULT_WATCHLIST_ID, result.snapshot.symbol, result.meta)
      }
      else {
        // 失败时保留旧快照，仅记录错误信息
        recordQuoteError(result.snapshot.symbol, result.snapshot.error, result.snapshot.fetchedAt!)
      }
    }
  }

  return {
    snapshots: getQuoteSnapshots(requested),
    refreshed: toFetch,
  }
})
