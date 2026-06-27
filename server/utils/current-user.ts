import type { H3Event } from 'h3'
import { DEFAULT_WATCHLIST_ID } from './db'

export async function getCurrentSession(event: H3Event) {
  return useAuth().api.getSession({
    headers: toWebRequest(event).headers,
  })
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
export async function resolveWatchlistId(event: H3Event): Promise<string> {
  const session = await getCurrentSession(event)
  return session ? await findOrCreateUserWatchlist(session.user.id) : DEFAULT_WATCHLIST_ID
}
