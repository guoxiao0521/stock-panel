import type { MacroMetricSnapshot } from '#shared/types'

interface MacroRow {
  symbol: string
  name: string | null
  value: number | null
  change: number | null
  change_percent: number | null
  quote_time: string | null
  fetched_at: string | null
  error: string | null
  error_at: string | null
  raw_json: string | null
}

function parseSpark(rawJson: string | null): number[] | null {
  if (!rawJson)
    return null
  try {
    const parsed = JSON.parse(rawJson) as { spark?: unknown }
    if (Array.isArray(parsed.spark) && parsed.spark.every(v => typeof v === 'number'))
      return parsed.spark as number[]
    return null
  }
  catch {
    return null
  }
}

function mapMacro(row: MacroRow): MacroMetricSnapshot {
  return {
    symbol: row.symbol,
    name: row.name ?? row.symbol,
    value: row.value,
    change: row.change,
    changePercent: row.change_percent,
    spark: parseSpark(row.raw_json),
    quoteTime: row.quote_time,
    fetchedAt: row.fetched_at,
    error: row.error,
    errorAt: row.error_at,
  }
}

/** 写入或更新一条宏观指标快照（每个 symbol 仅保留最新） */
export function upsertMacroSnapshot(snapshot: MacroMetricSnapshot, raw?: unknown) {
  const db = useDatabase()
  const rawJson = JSON.stringify({ spark: snapshot.spark, raw: raw ?? null })
  // 成功写入时清空错误状态（error / error_at 置空）
  db.prepare(
    `INSERT INTO macro_metric_snapshots
       (symbol, name, value, change, change_percent, quote_time, fetched_at, error, error_at, raw_json)
     VALUES
       (@symbol, @name, @value, @change, @changePercent, @quoteTime, @fetchedAt, NULL, NULL, @rawJson)
     ON CONFLICT(symbol) DO UPDATE SET
       name = excluded.name,
       value = excluded.value,
       change = excluded.change,
       change_percent = excluded.change_percent,
       quote_time = excluded.quote_time,
       fetched_at = excluded.fetched_at,
       error = NULL,
       error_at = NULL,
       raw_json = excluded.raw_json`,
  ).run({
    symbol: snapshot.symbol,
    name: snapshot.name,
    value: snapshot.value,
    change: snapshot.change,
    changePercent: snapshot.changePercent,
    quoteTime: snapshot.quoteTime,
    fetchedAt: snapshot.fetchedAt,
    rawJson,
  })
}

/**
 * 仅记录刷新错误，保留已有快照数据（PRD 10.2 / 14）。
 * 不更新 fetched_at（避免失败刷新让旧数据“看起来很新”），仅写入 error / error_at。
 * 若该 symbol 尚无快照，则插入一条仅含错误的占位记录。
 */
export function recordMacroError(symbol: string, name: string, error: string, errorAt: string) {
  const db = useDatabase()
  db.prepare(
    `INSERT INTO macro_metric_snapshots (symbol, name, error, error_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(symbol) DO UPDATE SET
       error = excluded.error,
       error_at = excluded.error_at`,
  ).run(symbol, name, error, errorAt)
}

export function getMacroSnapshots(symbols: string[]): MacroMetricSnapshot[] {
  if (symbols.length === 0)
    return []
  const db = useDatabase()
  const placeholders = symbols.map(() => '?').join(',')
  const rows = db
    .prepare(`SELECT * FROM macro_metric_snapshots WHERE symbol IN (${placeholders})`)
    .all(...symbols) as MacroRow[]
  return rows.map(mapMacro)
}
