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
  nav_price: number | null
  premium_discount_percent: number | null
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
    volume: row.volume == null ? null : Number(row.volume),
    turnoverRate: row.turnover_rate,
    trailingPe: row.trailing_pe,
    forwardPe: row.forward_pe,
    marketCap: row.market_cap == null ? null : Number(row.market_cap),
    navPrice: row.nav_price,
    premiumDiscountPercent: row.premium_discount_percent,
    quoteTime: row.quote_time,
    fetchedAt: row.fetched_at,
    source: row.source,
    error: row.error,
  }
}

/** 写入或更新一条行情快照（每个 symbol 仅保留最新，PRD 15） */
export async function upsertQuoteSnapshot(snapshot: QuoteSnapshot, rawJson?: string | null): Promise<void> {
  await dbQuery(
    `INSERT INTO stock_panel.quote_snapshots
       (symbol, price, change, change_percent, ytd_change_percent, volume, turnover_rate,
        trailing_pe, forward_pe, market_cap, nav_price, premium_discount_percent,
        quote_time, fetched_at, source, error, raw_json)
     VALUES
       ($1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12, $13, $14, $15, $16, $17::jsonb)
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
       nav_price = excluded.nav_price,
       premium_discount_percent = excluded.premium_discount_percent,
       quote_time = excluded.quote_time,
       fetched_at = excluded.fetched_at,
       source = excluded.source,
       error = excluded.error,
       raw_json = excluded.raw_json`,
    [
      snapshot.symbol,
      snapshot.price,
      snapshot.change,
      snapshot.changePercent,
      snapshot.ytdChangePercent,
      snapshot.volume,
      snapshot.turnoverRate,
      snapshot.trailingPe,
      snapshot.forwardPe,
      snapshot.marketCap,
      snapshot.navPrice,
      snapshot.premiumDiscountPercent,
      snapshot.quoteTime,
      snapshot.fetchedAt,
      snapshot.source,
      snapshot.error,
      rawJson ?? null,
    ],
  )
}

/**
 * 仅记录单只股票的刷新错误，保留已有快照数据（PRD 10.2 / 14）。
 * 若该 symbol 尚无快照，则插入一条仅含错误的占位记录。
 */
export async function recordQuoteError(symbol: string, error: string, fetchedAt: string): Promise<void> {
  await dbQuery(
    `INSERT INTO stock_panel.quote_snapshots (symbol, fetched_at, source, error)
     VALUES ($1, $2, 'yahoo-finance2', $3)
     ON CONFLICT(symbol) DO UPDATE SET
       error = excluded.error,
       fetched_at = excluded.fetched_at`,
    [symbol.toUpperCase(), fetchedAt, error],
  )
}

export async function getQuoteSnapshots(symbols: string[]): Promise<QuoteSnapshot[]> {
  if (symbols.length === 0)
    return []
  const { rows } = await dbQuery<QuoteRow>(
    `SELECT * FROM stock_panel.quote_snapshots WHERE symbol = ANY($1::text[])`,
    [symbols.map(s => s.toUpperCase())],
  )
  return rows.map(mapQuote)
}

export async function getQuoteSnapshot(symbol: string): Promise<QuoteSnapshot | null> {
  const { rows } = await dbQuery<QuoteRow>(
    `SELECT * FROM stock_panel.quote_snapshots WHERE symbol = $1`,
    [symbol.toUpperCase()],
  )
  const row = rows[0]
  return row ? mapQuote(row) : null
}
