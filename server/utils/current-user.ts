import type { H3Event } from 'h3'
import { DEFAULT_WATCHLIST_ID } from './db'

function toAuthHeaders(event: H3Event): Headers {
  const headers = new Headers()
  for (const [key, value] of Object.entries(event.node.req.headers)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(key, item)
      }
    }
    else if (value != null) {
      headers.set(key, value)
    }
  }
  return headers
}

function isTransientConnectionError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  const cause = error instanceof Error && error.cause instanceof Error
    ? error.cause.message
    : ''
  return `${message} ${cause}`.toLowerCase().includes('connection')
}

export async function getCurrentSession(event: H3Event) {
  const options = { headers: toAuthHeaders(event) }
  try {
    return await useAuth().api.getSession(options)
  }
  catch (error) {
    if (!isTransientConnectionError(error))
      throw error

    // A Supabase pooler connection can be closed between checkout and query.
    // pg removes that client; a single retry then acquires a fresh connection.
    await new Promise(resolve => setTimeout(resolve, 250))
    return useAuth().api.getSession(options)
  }
}

export async function requireCurrentSession(event: H3Event) {
  const session = await getCurrentSession(event)
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  return session
}

/**
 * 解析当前请求归属的自选股列表 ID。
 * 已登录 → 惰性建立用户个人列表并返回其 ID；
 * 未登录 → 返回匿名共享默认列表 ID。
 */
export async function resolveWatchlistId(event: H3Event, knownUserId?: string): Promise<string> {
  if (knownUserId)
    return findOrCreateUserWatchlist(knownUserId)

  const session = await getCurrentSession(event)
  return session ? await findOrCreateUserWatchlist(session.user.id) : DEFAULT_WATCHLIST_ID
}
