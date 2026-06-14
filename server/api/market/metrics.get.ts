import type { MacroMetricSnapshot } from '#shared/types'
import { MACRO_METRICS, MACRO_SYMBOLS } from '../../utils/macro-config'

/** GET /api/market/metrics — 获取宏观指标缓存快照（PRD 12.3） */
export default defineEventHandler(() => {
  const cached = new Map(getMacroSnapshots(MACRO_SYMBOLS).map(m => [m.symbol, m]))

  // 按配置顺序返回，缺失项用占位快照填充，保证前端卡片布局稳定
  const metrics: MacroMetricSnapshot[] = MACRO_METRICS.map(cfg =>
    cached.get(cfg.symbol) ?? {
      symbol: cfg.symbol,
      name: cfg.name,
      value: null,
      change: null,
      changePercent: null,
      spark: null,
      quoteTime: null,
      fetchedAt: null,
      error: null,
      errorAt: null,
    },
  )

  return { metrics }
})
