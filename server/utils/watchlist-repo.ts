import type {
  CreateWatchlistItemBody,
  QuoteSnapshot,
  UpdateWatchlistItemBody,
  WatchlistItem,
  WatchlistRow,
} from '#shared/types'
import { randomUUID } from 'node:crypto'

interface ItemRow {
  id: string
  watchlist_id: string
  symbol: string
  name: string | null
  exchange: string | null
  currency: string | null
  note: string | null
  tags_json: unknown
  cost_price: string | number | null
  share_count: string | number | null
  sort_order: number
  created_at: string
  updated_at: string
}

interface QuoteRow {
  symbol: string
  price: string | number | null
  change: string | number | null
  change_percent: string | number | null
  ytd_change_percent: string | number | null
  volume: string | number | null
  turnover_rate: string | number | null
  trailing_pe: string | number | null
  forward_pe: string | number | null
  market_cap: string | number | null
  nav_price: string | number | null
  premium_discount_percent: string | number | null
  quote_time: string | null
  fetched_at: string | null
  source: string | null
  error: string | null
}

function parseTags(json: unknown): string[] {
  if (Array.isArray(json))
    return json.filter(t => typeof t === 'string')
  if (typeof json !== 'string')
    return []
  try {
    const parsed = JSON.parse(json)
    return Array.isArray(parsed) ? parsed.filter(t => typeof t === 'string') : []
  }
  catch {
    return []
  }
}

function parseNullableNumber(value: string | number | null): number | null {
  if (value === null)
    return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function mapItem(row: ItemRow): WatchlistItem {
  return {
    id: row.id,
    watchlistId: row.watchlist_id,
    symbol: row.symbol,
    name: row.name,
    exchange: row.exchange,
    currency: row.currency,
    note: row.note,
    tags: parseTags(row.tags_json),
    costPrice: parseNullableNumber(row.cost_price),
    shareCount: parseNullableNumber(row.share_count),
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapQuote(row: QuoteRow): QuoteSnapshot {
  return {
    symbol: row.symbol,
    price: parseNullableNumber(row.price),
    change: parseNullableNumber(row.change),
    changePercent: parseNullableNumber(row.change_percent),
    ytdChangePercent: parseNullableNumber(row.ytd_change_percent),
    volume: parseNullableNumber(row.volume),
    turnoverRate: parseNullableNumber(row.turnover_rate),
    trailingPe: parseNullableNumber(row.trailing_pe),
    forwardPe: parseNullableNumber(row.forward_pe),
    marketCap: parseNullableNumber(row.market_cap),
    navPrice: parseNullableNumber(row.nav_price),
    premiumDiscountPercent: parseNullableNumber(row.premium_discount_percent),
    quoteTime: row.quote_time,
    fetchedAt: row.fetched_at,
    source: row.source,
    error: row.error,
  }
}

/** 列出列表内的自选股条目（含最近行情快照） */
export async function listWatchlistRows(watchlistId: string): Promise<WatchlistRow[]> {
  const { rows: items } = await dbQuery<ItemRow>(
    `SELECT * FROM stock_panel.watchlist_items WHERE watchlist_id = $1 ORDER BY sort_order ASC, created_at ASC`,
    [watchlistId],
  )

  if (items.length === 0)
    return []

  const symbols = items.map(i => i.symbol)
  const { rows: quotes } = await dbQuery<QuoteRow>(
    `SELECT * FROM stock_panel.quote_snapshots WHERE symbol = ANY($1::text[])`,
    [symbols],
  )
  const quoteMap = new Map(quotes.map(q => [q.symbol, mapQuote(q)]))

  return items.map(row => ({
    ...mapItem(row),
    quote: quoteMap.get(row.symbol) ?? null,
  }))
}

export async function findItemById(id: string): Promise<WatchlistItem | null> {
  const { rows } = await dbQuery<ItemRow>(
    `SELECT * FROM stock_panel.watchlist_items WHERE id = $1`,
    [id],
  )
  const row = rows[0]
  return row ? mapItem(row) : null
}

export async function findItemBySymbol(watchlistId: string, symbol: string): Promise<WatchlistItem | null> {
  const { rows } = await dbQuery<ItemRow>(
    `SELECT * FROM stock_panel.watchlist_items WHERE watchlist_id = $1 AND symbol = $2`,
    [watchlistId, symbol.toUpperCase()],
  )
  const row = rows[0]
  return row ? mapItem(row) : null
}

export async function createWatchlistItem(
  watchlistId: string,
  body: CreateWatchlistItemBody,
): Promise<WatchlistItem> {
  const symbol = body.symbol.trim().toUpperCase()
  const now = new Date().toISOString()
  const id = randomUUID()

  const { rows: orderRows } = await dbQuery<{ m: number }>(
    `SELECT COALESCE(MAX(sort_order), -1) AS m FROM stock_panel.watchlist_items WHERE watchlist_id = $1`,
    [watchlistId],
  )
  const maxOrder = Number(orderRows[0]?.m ?? -1)

  await dbQuery(
    `INSERT INTO stock_panel.watchlist_items
       (id, watchlist_id, symbol, name, exchange, currency, note, tags_json, sort_order, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11)`,
    [
      id,
      watchlistId,
      symbol,
      body.name ?? null,
      body.exchange ?? null,
      body.currency ?? null,
      null,
      '[]',
      maxOrder + 1,
      now,
      now,
    ],
  )

  return (await findItemById(id))!
}

export async function updateWatchlistItem(
  id: string,
  body: UpdateWatchlistItemBody,
): Promise<WatchlistItem | null> {
  const existing = await findItemById(id)
  if (!existing)
    return null

  const note = body.note !== undefined ? body.note : existing.note
  const tags = body.tags !== undefined ? body.tags : existing.tags
  const costPrice = body.costPrice !== undefined ? body.costPrice : existing.costPrice
  const shareCount = body.shareCount !== undefined ? body.shareCount : existing.shareCount
  const sortOrder = body.sortOrder !== undefined ? body.sortOrder : existing.sortOrder
  const now = new Date().toISOString()

  await dbQuery(
    `UPDATE stock_panel.watchlist_items
       SET note = $1,
           tags_json = $2::jsonb,
           cost_price = $3,
           share_count = $4,
           sort_order = $5,
           updated_at = $6
     WHERE id = $7`,
    [note, JSON.stringify(tags), costPrice, shareCount, sortOrder, now, id],
  )

  return findItemById(id)
}

/** 用 yahoo 行情回填公司名/交易所/币种（仅当本地为空时） */
export async function backfillItemMeta(
  watchlistId: string,
  symbol: string,
  meta: { name: string | null, exchange: string | null, currency: string | null },
): Promise<void> {
  await dbQuery(
    `UPDATE stock_panel.watchlist_items
       SET name = COALESCE(name, $1),
           exchange = COALESCE(exchange, $2),
           currency = COALESCE(currency, $3),
           updated_at = $4
     WHERE watchlist_id = $5 AND symbol = $6`,
    [meta.name, meta.exchange, meta.currency, new Date().toISOString(), watchlistId, symbol.toUpperCase()],
  )
}

/** 列出列表内全部 symbol */
export async function listWatchlistSymbols(watchlistId: string): Promise<string[]> {
  const { rows } = await dbQuery<{ symbol: string }>(
    `SELECT symbol FROM stock_panel.watchlist_items WHERE watchlist_id = $1`,
    [watchlistId],
  )
  return rows.map(r => r.symbol)
}

export async function deleteWatchlistItem(id: string): Promise<boolean> {
  const result = await dbQuery(`DELETE FROM stock_panel.watchlist_items WHERE id = $1`, [id])
  return result.rowCount > 0
}

/** 查找或建立用户专属自选股列表，返回其 ID */
export async function findOrCreateUserWatchlist(userId: string): Promise<string> {
  const { rows } = await dbQuery<{ id: string }>(
    `SELECT id FROM stock_panel.watchlists WHERE user_id = $1 LIMIT 1`,
    [userId],
  )
  if (rows[0])
    return rows[0].id

  const id = randomUUID()
  const now = new Date().toISOString()
  const result = await dbQuery<{ id: string }>(
    `INSERT INTO stock_panel.watchlists (id, name, user_id, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id) WHERE user_id IS NOT NULL DO UPDATE
       SET updated_at = stock_panel.watchlists.updated_at
     RETURNING id`,
    [id, '我的自选股', userId, now, now],
  )
  return result.rows[0]?.id ?? id
}
