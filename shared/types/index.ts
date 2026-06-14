// 前后端共用的领域类型，对应 PRD 第 11 节 SQLite 数据模型

/** 自选股列表（预留多列表能力，Phase 1 仅默认列表） */
export interface Watchlist {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

/** 自选股条目（用户维护的数据） */
export interface WatchlistItem {
  id: string
  watchlistId: string
  symbol: string
  name: string | null
  exchange: string | null
  currency: string | null
  note: string | null
  tags: string[]
  sortOrder: number
  createdAt: string
  updatedAt: string
}

/** 行情快照（来自 yahoo-finance2 + 计算字段） */
export interface QuoteSnapshot {
  symbol: string
  price: number | null
  change: number | null
  changePercent: number | null
  /** 年初至今涨跌幅 */
  ytdChangePercent: number | null
  volume: number | null
  /** 换手率 */
  turnoverRate: number | null
  /** 静态市盈率 */
  trailingPe: number | null
  /** 预期市盈率 */
  forwardPe: number | null
  marketCap: number | null
  quoteTime: string | null
  fetchedAt: string | null
  source: string | null
  error: string | null
}

/** 表格展示行：自选股条目 + 行情快照的合并视图 */
export interface WatchlistRow extends WatchlistItem {
  quote: QuoteSnapshot | null
}

/** 宏观指标快照（Phase 2） */
export interface MacroMetricSnapshot {
  symbol: string
  name: string
  value: number | null
  change: number | null
  changePercent: number | null
  quoteTime: string | null
  fetchedAt: string | null
}

/** 排序方式 */
export type SortKey
  = | 'manual'
    | 'changePercent'
    | 'ytdChangePercent'
    | 'trailingPe'
    | 'turnoverRate'
    | 'createdAt'

export type SortDirection = 'asc' | 'desc'

export interface SortOption {
  value: SortKey
  label: string
}

export const SORT_OPTIONS: SortOption[] = [
  { value: 'manual', label: '手动排序' },
  { value: 'changePercent', label: '日涨跌幅' },
  { value: 'ytdChangePercent', label: '年初至今' },
  { value: 'trailingPe', label: '市盈率' },
  { value: 'turnoverRate', label: '换手率' },
  { value: 'createdAt', label: '添加时间' },
]

// 自选股 CRUD API 的请求体类型

export interface CreateWatchlistItemBody {
  symbol: string
  name?: string | null
  exchange?: string | null
  currency?: string | null
}

export interface UpdateWatchlistItemBody {
  note?: string | null
  tags?: string[]
  sortOrder?: number
}
