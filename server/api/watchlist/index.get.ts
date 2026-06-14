import { DEFAULT_WATCHLIST_ID } from '../../utils/db'

/** GET /api/watchlist — 获取默认自选股列表及最近行情快照 */
export default defineEventHandler(() => {
  const items = listWatchlistRows(DEFAULT_WATCHLIST_ID)
  return {
    watchlistId: DEFAULT_WATCHLIST_ID,
    items,
  }
})
