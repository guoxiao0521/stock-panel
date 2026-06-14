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
  /** 近 5 个交易日收盘价序列，用于短期趋势 sparkline */
  spark: number[] | null
  quoteTime: string | null
  /** 最近一次成功拉取时间（失败刷新不更新此字段） */
  fetchedAt: string | null
  error: string | null
  /** 最近一次刷新失败的时间，便于区分“数据新鲜”与“刷新失败” */
  errorAt: string | null
}

/** 历史走势区间（个股详情 K 线图） */
export type HistoryRange = '1M' | '3M' | '6M' | '1Y'

export const HISTORY_RANGES: HistoryRange[] = ['1M', '3M', '6M', '1Y']

/** 单根 K 线（OHLC），time 为 yyyy-mm-dd（交易日） */
export interface Candle {
  time: string
  open: number
  high: number
  low: number
  close: number
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
