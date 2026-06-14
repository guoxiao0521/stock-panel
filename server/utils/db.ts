import type { Database as DatabaseType } from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import Database from 'better-sqlite3'

let db: DatabaseType | null = null

/** 默认自选股列表 ID，Phase 1 仅使用该列表 */
export const DEFAULT_WATCHLIST_ID = 'default'

const SCHEMA = `
CREATE TABLE IF NOT EXISTS watchlists (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS watchlist_items (
  id            TEXT PRIMARY KEY,
  watchlist_id  TEXT NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
  symbol        TEXT NOT NULL,
  name          TEXT,
  exchange      TEXT,
  currency      TEXT,
  note          TEXT,
  tags_json     TEXT NOT NULL DEFAULT '[]',
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_watchlist_items_symbol
  ON watchlist_items(watchlist_id, symbol);

CREATE TABLE IF NOT EXISTS quote_snapshots (
  symbol               TEXT PRIMARY KEY,
  price                REAL,
  change               REAL,
  change_percent       REAL,
  ytd_change_percent   REAL,
  volume               INTEGER,
  turnover_rate        REAL,
  trailing_pe          REAL,
  forward_pe           REAL,
  market_cap           INTEGER,
  quote_time           TEXT,
  fetched_at           TEXT,
  source               TEXT,
  error                TEXT,
  raw_json             TEXT
);

CREATE TABLE IF NOT EXISTS macro_metric_snapshots (
  symbol          TEXT PRIMARY KEY,
  name            TEXT,
  value           REAL,
  change          REAL,
  change_percent  REAL,
  quote_time      TEXT,
  fetched_at      TEXT,
  error           TEXT,
  error_at        TEXT,
  raw_json        TEXT
);
`

/** 幂等添加列，兼容更早版本已创建的表结构 */
function ensureColumn(database: DatabaseType, table: string, column: string, ddl: string) {
  const cols = database.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]
  if (!cols.some(c => c.name === column))
    database.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`)
}

function initSchema(database: DatabaseType) {
  database.exec(SCHEMA)
  // 迁移：早期 macro_metric_snapshots 无 error / error_at 列
  ensureColumn(database, 'macro_metric_snapshots', 'error', 'error TEXT')
  ensureColumn(database, 'macro_metric_snapshots', 'error_at', 'error_at TEXT')
  // 初始化默认列表
  const now = new Date().toISOString()
  database
    .prepare(
      `INSERT OR IGNORE INTO watchlists (id, name, created_at, updated_at)
       VALUES (?, ?, ?, ?)`,
    )
    .run(DEFAULT_WATCHLIST_ID, '默认自选股', now, now)
}

/** 获取（并惰性初始化）SQLite 连接单例 */
export function useDatabase(): DatabaseType {
  if (db)
    return db

  const config = useRuntimeConfig()
  const dbPath = process.env.NUXT_DB_PATH || (config.dbPath as string)
  const absolute = resolve(dbPath)
  mkdirSync(dirname(absolute), { recursive: true })

  db = new Database(absolute)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  initSchema(db)
  return db
}
