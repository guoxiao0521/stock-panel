import type { QuoteSnapshot, SortDirection, SortKey, WatchlistRow } from '#shared/types'
import { computed, ref } from 'vue'

/**
 * 自选股状态管理（接入 server API）。
 * 搜索/排序在前端完成（见 PRD 15），数据持久化由 /api/watchlist 负责。
 * TODO(Milestone 3): refresh 接入 /api/quotes/refresh 拉取实时行情。
 */

// 模块级缓存：跨路由切换保持数据，避免每次挂载重新请求
const items = ref<WatchlistRow[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
let initialized = false

function getSortValue(row: WatchlistRow, key: SortKey): number | string | null {
  switch (key) {
    case 'changePercent':
      return row.quote?.changePercent ?? null
    case 'ytdChangePercent':
      return row.quote?.ytdChangePercent ?? null
    case 'trailingPe':
      return row.quote?.trailingPe ?? null
    case 'turnoverRate':
      return row.quote?.turnoverRate ?? null
    case 'createdAt':
      return row.createdAt
    case 'manual':
    default:
      return row.sortOrder
  }
}

export function useWatchlist() {
  // UI 状态保持实例级（路由切换后重置搜索/排序符合预期）
  const search = ref('')
  const sortKey = ref<SortKey>('manual')
  const sortDirection = ref<SortDirection>('desc')

  const filtered = computed<WatchlistRow[]>(() => {
    const keyword = search.value.trim().toLowerCase()
    let result = items.value
    if (keyword) {
      result = result.filter((row) => {
        return (
          row.symbol.toLowerCase().includes(keyword)
          || (row.name?.toLowerCase().includes(keyword) ?? false)
          || row.tags.some(tag => tag.toLowerCase().includes(keyword))
        )
      })
    }

    const key = sortKey.value
    const dir = key === 'manual' ? 'asc' : sortDirection.value
    const factor = dir === 'asc' ? 1 : -1

    return [...result].sort((a, b) => {
      const va = getSortValue(a, key)
      const vb = getSortValue(b, key)
      if (va === null && vb === null)
        return 0
      if (va === null)
        return 1
      if (vb === null)
        return -1
      if (typeof va === 'number' && typeof vb === 'number')
        return (va - vb) * factor
      return String(va).localeCompare(String(vb)) * factor
    })
  })

  function hasSymbol(symbol: string): boolean {
    const upper = symbol.toUpperCase()
    return items.value.some(item => item.symbol === upper)
  }

  async function load(force = false) {
    if (initialized && !force)
      return
    loading.value = true
    error.value = null
    try {
      const data = await $fetch('/api/watchlist')
      items.value = data.items
      initialized = true
    }
    catch {
      error.value = '加载自选股失败'
    }
    finally {
      loading.value = false
    }
  }

  /** 添加自选股，失败时抛出包含错误信息的异常 */
  async function add(symbol: string): Promise<WatchlistRow> {
    const item = await $fetch('/api/watchlist/items', {
      method: 'POST',
      body: { symbol: symbol.trim().toUpperCase() },
      timeout: 30_000,
    })
    items.value.push(item as WatchlistRow)
    return item as WatchlistRow
  }

  async function remove(id: string) {
    await $fetch(`/api/watchlist/items/${id}`, { method: 'DELETE' })
    items.value = items.value.filter(item => item.id !== id)
  }

  async function updateNote(id: string, note: string) {
    const updated = await $fetch(`/api/watchlist/items/${id}`, {
      method: 'PATCH',
      body: { note },
    })
    patchLocal(id, updated)
  }

  async function updateTags(id: string, tags: string[]) {
    const updated = await $fetch(`/api/watchlist/items/${id}`, {
      method: 'PATCH',
      body: { tags },
    })
    patchLocal(id, updated)
  }

  function patchLocal(id: string, updated: { note: string | null, tags: string[], updatedAt: string }) {
    const item = items.value.find(i => i.id === id)
    if (item) {
      item.note = updated.note
      item.tags = updated.tags
      item.updatedAt = updated.updatedAt
    }
  }

  function applyQuotes(snapshots: QuoteSnapshot[]) {
    const map = new Map(snapshots.map(s => [s.symbol, s]))
    for (const item of items.value) {
      const snap = map.get(item.symbol)
      if (snap)
        item.quote = snap
    }
  }

  /** 刷新行情。force=true 时忽略缓存全部重新拉取（手动刷新） */
  async function refresh(force = false) {
    if (items.value.length === 0)
      return
    loading.value = true
    error.value = null
    try {
      const data = await $fetch('/api/quotes/refresh', {
        method: 'POST',
        body: { force },
      })
      applyQuotes(data.snapshots as QuoteSnapshot[])
    }
    catch {
      error.value = '刷新行情失败'
    }
    finally {
      loading.value = false
    }
  }

  return {
    items,
    filtered,
    search,
    sortKey,
    sortDirection,
    loading,
    error,
    hasSymbol,
    load,
    add,
    remove,
    updateNote,
    updateTags,
    refresh,
  }
}
