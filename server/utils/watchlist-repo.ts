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
  tags_json: string
  sort_order: number
  created_at: string
  updated_at: string
}

interface QuoteRow {
  symbol: string
  price: number | null
  change: number | null
  change_percent: number | null
  ytd_change_percent: number | null
  volume: number | null
  turnover_rate: number | null
  trailing_pe: number | null
  forward_pe: number | null
  market_cap: number | null
  quote_time: string | null
  fetched_at: string | null
  source: string | null
  error: string | null
}

function parseTags(json: string): string[] {
  try {
    const parsed = JSON.parse(json)
    return Array.isArray(parsed) ? parsed.filter(t => typeof t === 'string') : []
  }
  catch {
    return []
  }
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
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapQuote(row: QuoteRow): QuoteSnapshot {
  return {
    symbol: row.symbol,
    price: row.price,
    change: row.change,
    changePercent: row.change_percent,
    ytdChangePercent: row.ytd_change_percent,
    volume: row.volume,
    turnoverRate: row.turnover_rate,
    trailingPe: row.trailing_pe,
    forwardPe: row.forward_pe,
    marketCap: row.market_cap,
    quoteTime: row.quote_time,
    fetchedAt: row.fetched_at,
    source: row.source,
    error: row.error,
  }
}

/** 列出列表内的自选股条目（含最近行情快照） */
export function listWatchlistRows(watchlistId: string): WatchlistRow[] {
  const db = useDatabase()
  const items = db
    .prepare(`SELECT * FROM watchlist_items WHERE watchlist_id = ? ORDER BY sort_order ASC, created_at ASC`)
    .all(watchlistId) as ItemRow[]

  if (items.length === 0)
    return []

  const symbols = items.map(i => i.symbol)
  const placeholders = symbols.map(() => '?').join(',')
  const quotes = db
    .prepare(`SELECT * FROM quote_snapshots WHERE symbol IN (${placeholders})`)
    .all(...symbols) as QuoteRow[]
  const quoteMap = new Map(quotes.map(q => [q.symbol, mapQuote(q)]))

  return items.map(row => ({
    ...mapItem(row),
    quote: quoteMap.get(row.symbol) ?? null,
  }))
}

export function findItemById(id: string): WatchlistItem | null {
  const db = useDatabase()
  const row = db.prepare(`SELECT * FROM watchlist_items WHERE id = ?`).get(id) as ItemRow | undefined
  return row ? mapItem(row) : null
}

export function findItemBySymbol(watchlistId: string, symbol: string): WatchlistItem | null {
  const db = useDatabase()
  const row = db
    .prepare(`SELECT * FROM watchlist_items WHERE watchlist_id = ? AND symbol = ?`)
    .get(watchlistId, symbol.toUpperCase()) as ItemRow | undefined
  return row ? mapItem(row) : null
}

export function createWatchlistItem(
  watchlistId: string,
  body: CreateWatchlistItemBody,
): WatchlistItem {
  const db = useDatabase()
  const symbol = body.symbol.trim().toUpperCase()
  const now = new Date().toISOString()
  const id = randomUUID()

  const maxOrder = db
    .prepare(`SELECT COALESCE(MAX(sort_order), -1) AS m FROM watchlist_items WHERE watchlist_id = ?`)
    .get(watchlistId) as { m: number }

  db.prepare(
    `INSERT INTO watchlist_items
       (id, watchlist_id, symbol, name, exchange, currency, note, tags_json, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    watchlistId,
    symbol,
    body.name ?? null,
    body.exchange ?? null,
    body.currency ?? null,
    null,
    '[]',
    maxOrder.m + 1,
    now,
    now,
  )

  return findItemById(id)!
}

export function updateWatchlistItem(
  id: string,
  body: UpdateWatchlistItemBody,
): WatchlistItem | null {
  const db = useDatabase()
  const existing = findItemById(id)
  if (!existing)
    return null

  const note = body.note !== undefined ? body.note : existing.note
  const tags = body.tags !== undefined ? body.tags : existing.tags
  const sortOrder = body.sortOrder !== undefined ? body.sortOrder : existing.sortOrder
  const now = new Date().toISOString()

  db.prepare(
    `UPDATE watchlist_items
       SET note = ?, tags_json = ?, sort_order = ?, updated_at = ?
     WHERE id = ?`,
  ).run(note, JSON.stringify(tags), sortOrder, now, id)

  return findItemById(id)
}

/** 用 yahoo 行情回填公司名/交易所/币种（仅当本地为空时） */
export function backfillItemMeta(
  watchlistId: string,
  symbol: string,
  meta: { name: string | null, exchange: string | null, currency: string | null },
) {
  const db = useDatabase()
  db.prepare(
    `UPDATE watchlist_items
       SET name = COALESCE(name, ?),
           exchange = COALESCE(exchange, ?),
           currency = COALESCE(currency, ?),
           updated_at = ?
     WHERE watchlist_id = ? AND symbol = ?`,
  ).run(meta.name, meta.exchange, meta.currency, new Date().toISOString(), watchlistId, symbol.toUpperCase())
}

/** 列出列表内全部 symbol */
export function listWatchlistSymbols(watchlistId: string): string[] {
  const db = useDatabase()
  const rows = db
    .prepare(`SELECT symbol FROM watchlist_items WHERE watchlist_id = ?`)
    .all(watchlistId) as { symbol: string }[]
  return rows.map(r => r.symbol)
}

export function deleteWatchlistItem(id: string): boolean {
  const db = useDatabase()
  const result = db.prepare(`DELETE FROM watchlist_items WHERE id = ?`).run(id)
  return result.changes > 0
}
