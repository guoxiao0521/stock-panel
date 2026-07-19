import type { CreateTradeBody, TradeRecord, TradeSide } from '#shared/types'
import { randomUUID } from 'node:crypto'

interface TradeRow {
  id: string
  watchlist_id: string
  symbol: string
  side: string
  quantity: string | number
  price: string | number
  fee: string | number
  traded_at: string
  created_at: string
  updated_at: string
}

function parseNumber(value: string | number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function mapTrade(row: TradeRow): TradeRecord {
  return {
    id: row.id,
    watchlistId: row.watchlist_id,
    symbol: row.symbol,
    side: row.side as TradeSide,
    quantity: parseNumber(row.quantity),
    price: parseNumber(row.price),
    fee: parseNumber(row.fee),
    tradedAt: row.traded_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/** 列出交易记录，按 traded_at、created_at 升序（便于回放） */
export async function listTrades(watchlistId: string, symbol?: string): Promise<TradeRecord[]> {
  if (symbol) {
    const { rows } = await dbQuery<TradeRow>(
      `SELECT * FROM stock_panel.trades
       WHERE watchlist_id = $1 AND symbol = $2
       ORDER BY traded_at ASC, created_at ASC, id ASC`,
      [watchlistId, symbol.toUpperCase()],
    )
    return rows.map(mapTrade)
  }

  const { rows } = await dbQuery<TradeRow>(
    `SELECT * FROM stock_panel.trades
     WHERE watchlist_id = $1
     ORDER BY traded_at ASC, created_at ASC, id ASC`,
    [watchlistId],
  )
  return rows.map(mapTrade)
}

export async function findTradeById(id: string): Promise<TradeRecord | null> {
  const { rows } = await dbQuery<TradeRow>(
    `SELECT * FROM stock_panel.trades WHERE id = $1`,
    [id],
  )
  const row = rows[0]
  return row ? mapTrade(row) : null
}

export async function insertTrade(
  watchlistId: string,
  body: Required<Pick<CreateTradeBody, 'symbol' | 'side' | 'quantity' | 'price' | 'fee' | 'tradedAt'>>,
): Promise<TradeRecord> {
  const id = randomUUID()
  const now = new Date().toISOString()
  const symbol = body.symbol.trim().toUpperCase()

  await dbQuery(
    `INSERT INTO stock_panel.trades
       (id, watchlist_id, symbol, side, quantity, price, fee, traded_at, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      id,
      watchlistId,
      symbol,
      body.side,
      body.quantity,
      body.price,
      body.fee,
      body.tradedAt,
      now,
      now,
    ],
  )

  return (await findTradeById(id))!
}

export async function deleteTrade(id: string): Promise<boolean> {
  const result = await dbQuery(`DELETE FROM stock_panel.trades WHERE id = $1`, [id])
  return result.rowCount > 0
}
