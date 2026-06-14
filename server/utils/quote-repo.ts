import type { QuoteSnapshot } from '#shared/types'

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

/** 写入或更新一条行情快照（每个 symbol 仅保留最新，PRD 15） */
export function upsertQuoteSnapshot(snapshot: QuoteSnapshot, rawJson?: string | null) {
  const db = useDatabase()
  db.prepare(
    `INSERT INTO quote_snapshots
       (symbol, price, change, change_percent, ytd_change_percent, volume, turnover_rate,
        trailing_pe, forward_pe, market_cap, quote_time, fetched_at, source, error, raw_json)
     VALUES
       (@symbol, @price, @change, @changePercent, @ytdChangePercent, @volume, @turnoverRate,
        @trailingPe, @forwardPe, @marketCap, @quoteTime, @fetchedAt, @source, @error, @rawJson)
     ON CONFLICT(symbol) DO UPDATE SET
       price = excluded.price,
       change = excluded.change,
       change_percent = excluded.change_percent,
       ytd_change_percent = excluded.ytd_change_percent,
       volume = excluded.volume,
       turnover_rate = excluded.turnover_rate,
       trailing_pe = excluded.trailing_pe,
       forward_pe = excluded.forward_pe,
       market_cap = excluded.market_cap,
       quote_time = excluded.quote_time,
       fetched_at = excluded.fetched_at,
       source = excluded.source,
       error = excluded.error,
       raw_json = excluded.raw_json`,
  ).run({
    symbol: snapshot.symbol,
    price: snapshot.price,
    change: snapshot.change,
    changePercent: snapshot.changePercent,
    ytdChangePercent: snapshot.ytdChangePercent,
    volume: snapshot.volume,
    turnoverRate: snapshot.turnoverRate,
    trailingPe: snapshot.trailingPe,
    forwardPe: snapshot.forwardPe,
    marketCap: snapshot.marketCap,
    quoteTime: snapshot.quoteTime,
    fetchedAt: snapshot.fetchedAt,
    source: snapshot.source,
    error: snapshot.error,
    rawJson: rawJson ?? null,
  })
}

/**
 * 仅记录单只股票的刷新错误，保留已有快照数据（PRD 10.2 / 14）。
 * 若该 symbol 尚无快照，则插入一条仅含错误的占位记录。
 */
export function recordQuoteError(symbol: string, error: string, fetchedAt: string) {
  const db = useDatabase()
  db.prepare(
    `INSERT INTO quote_snapshots (symbol, fetched_at, source, error)
     VALUES (?, ?, 'yahoo-finance2', ?)
     ON CONFLICT(symbol) DO UPDATE SET
       error = excluded.error,
       fetched_at = excluded.fetched_at`,
  ).run(symbol.toUpperCase(), fetchedAt, error)
}

export function getQuoteSnapshots(symbols: string[]): QuoteSnapshot[] {
  if (symbols.length === 0)
    return []
  const db = useDatabase()
  const placeholders = symbols.map(() => '?').join(',')
  const rows = db
    .prepare(`SELECT * FROM quote_snapshots WHERE symbol IN (${placeholders})`)
    .all(...symbols.map(s => s.toUpperCase())) as QuoteRow[]
  return rows.map(mapQuote)
}

export function getQuoteSnapshot(symbol: string): QuoteSnapshot | null {
  const db = useDatabase()
  const row = db
    .prepare(`SELECT * FROM quote_snapshots WHERE symbol = ?`)
    .get(symbol.toUpperCase()) as QuoteRow | undefined
  return row ? mapQuote(row) : null
}
