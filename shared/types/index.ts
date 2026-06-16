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

// Phase 3：AI 分析契约（映射 finance-skills 方法论，输出统一报告结构）

/** 内置分析 skill，对应 finance-skills 子集 */
export type AnalysisSkillId = 'overview' | 'sepa' | 'earningsPreview' | 'liquidity'

export interface AnalysisSkillOption {
  value: AnalysisSkillId
  label: string
  description: string
  /** finance-skills 源 skill 名称 */
  sourceSkill: string
}

export const ANALYSIS_SKILLS: AnalysisSkillOption[] = [
  {
    value: 'overview',
    label: '综合概览',
    description: '行情、技术位、宏观背景与用户备注的综合观察。',
    sourceSkill: 'yfinance-data',
  },
  {
    value: 'sepa',
    label: 'SEPA 趋势',
    description: 'Minervini 趋势模板、阶段判断与关键技术条件检查。',
    sourceSkill: 'sepa-strategy',
  },
  {
    value: 'earningsPreview',
    label: '财报预览',
    description: '财报前共识预期与历史 beat/miss（需更多财务数据）。',
    sourceSkill: 'earnings-preview',
  },
  {
    value: 'liquidity',
    label: '流动性',
    description: '成交量、换手率与流动性相关指标观察。',
    sourceSkill: 'stock-liquidity',
  },
]

export const ANALYSIS_SKILL_IDS: AnalysisSkillId[] = ANALYSIS_SKILLS.map(s => s.value)

export const ANALYSIS_DISCLAIMER
  = '本报告由自动化分析生成，仅供个人研究参考，不构成投资建议。数据可能延迟、缺失或不准确，请自行核实。'

export interface RunAnalysisBody {
  symbol: string
  skillId: AnalysisSkillId
  range?: HistoryRange
  /** 默认 true；设为 false 时允许使用本地缓存行情 */
  forceRefresh?: boolean
}

export interface AnalysisMetric {
  label: string
  value: string
  detail?: string
}

export interface AnalysisChecklistItem {
  label: string
  /** null 表示数据不足，无法判断 */
  pass: boolean | null
  detail?: string
}

export type AnalysisSectionKind = 'text' | 'metrics' | 'checklist' | 'list'

export interface AnalysisSection {
  title: string
  kind: AnalysisSectionKind
  content?: string
  metrics?: AnalysisMetric[]
  checklist?: AnalysisChecklistItem[]
  items?: string[]
}

export interface AnalysisTechnicalSummary {
  price: number | null
  ma50: number | null
  ma150: number | null
  ma200: number | null
  ma200Rising: boolean | null
  week52High: number | null
  week52Low: number | null
  pctFrom52WeekHigh: number | null
  pctAbove52WeekLow: number | null
  avgVolume20: number | null
  volumeRatio: number | null
  supportLevel: number | null
  resistanceLevel: number | null
}

export interface AnalysisMarketContext {
  volatility: string
  riskAppetite: string
  breadth: string
}

export interface AnalysisInputContext {
  symbol: string
  skillId: AnalysisSkillId
  range: HistoryRange
  companyName: string | null
  quote: QuoteSnapshot | null
  candles: Candle[]
  technical: AnalysisTechnicalSummary
  macroMetrics: MacroMetricSnapshot[]
  marketContext: AnalysisMarketContext
  watchlistNote: string | null
  watchlistTags: string[]
  dataGaps: string[]
}

export interface AnalysisReportMeta {
  provider: string
  model: string | null
  skillSource: string
}

export interface AnalysisReport {
  id: string
  symbol: string
  skillId: AnalysisSkillId
  title: string
  summary: string
  sections: AnalysisSection[]
  riskFlags: string[]
  dataGaps: string[]
  disclaimer: string
  createdAt: string
  meta: AnalysisReportMeta
}

export interface RunAnalysisResponse {
  report: AnalysisReport
}
