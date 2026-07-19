import type { PoolClient } from 'pg'
import { Pool, types } from 'pg'

let pool: Pool | null = null

export const DEFAULT_WATCHLIST_ID = 'default'
export const STOCK_PANEL_SCHEMA = 'stock_panel'

types.setTypeParser(types.builtins.INT8, value => Number(value))

function withDefaultSearchPath(connectionString: string): string {
  try {
    const url = new URL(connectionString)
    if (!url.searchParams.has('options')) {
      url.searchParams.set('options', `-c search_path=${STOCK_PANEL_SCHEMA},public`)
    }
    return url.toString()
  }
  catch {
    return connectionString
  }
}

function requiresSsl(connectionString: string): boolean {
  try {
    return new URL(connectionString).hostname.endsWith('.supabase.com')
  }
  catch {
    return false
  }
}

export function usePgPool(): Pool {
  if (pool)
    return pool

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is required for Postgres storage')
  }

  pool = new Pool({
    connectionString: withDefaultSearchPath(connectionString),
    // Supabase transaction pooler already multiplexes connections. Keeping the
    // local pool small avoids a connection burst when Nuxt loads several APIs.
    max: Number(process.env.DATABASE_POOL_MAX ?? 2),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 20_000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
    ssl: requiresSsl(connectionString) ? { rejectUnauthorized: false } : undefined,
  })
  pool.on('error', (error) => {
    console.error('[postgres] idle client error', error)
  })
  return pool
}

interface DbQueryResult<T> {
  rows: T[]
  rowCount: number | null
}

export async function dbQuery<T = Record<string, unknown>>(
  text: string,
  params: readonly unknown[] = [],
): Promise<DbQueryResult<T>> {
  const result = await usePgPool().query(text, params)
  return {
    rows: result.rows as T[],
    rowCount: result.rowCount,
  }
}

export async function withDbClient<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await usePgPool().connect()
  try {
    return await fn(client)
  }
  finally {
    client.release()
  }
}
