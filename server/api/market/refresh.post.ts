import type { MacroMetricSnapshot } from '#shared/types'
import { MACRO_METRICS, MACRO_SYMBOLS, macroName, resolveMacroSymbol } from '../../utils/macro-config'

interface RefreshBody {
  symbols?: string[]
  force?: boolean
}

// 默认缓存有效期 5 分钟（PRD 10.2）
const CACHE_TTL_MS = 5 * 60 * 1000

/** 按配置顺序返回，缺失项用占位快照填充 */
function buildResponse(): MacroMetricSnapshot[] {
  const cached = new Map(getMacroSnapshots(MACRO_SYMBOLS).map(m => [m.symbol, m]))
  return MACRO_METRICS.map(cfg =>
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
}

/** POST /api/market/refresh — 刷新宏观指标（PRD 12.3） */
export default defineEventHandler(async (event) => {
  const body = await readBody<RefreshBody>(event).catch(() => ({} as RefreshBody))

  // 归一化外部传入的 symbol（大小写无关），并记录无法识别的项
  const rejected: string[] = []
  let requested: string[]
  if (Array.isArray(body?.symbols) && body.symbols.length > 0) {
    requested = []
    for (const raw of body.symbols) {
      const canonical = resolveMacroSymbol(String(raw))
      if (canonical)
        requested.push(canonical)
      else
        rejected.push(String(raw))
    }
    // 去重，保持顺序
    requested = [...new Set(requested)]
  }
  else {
    requested = [...MACRO_SYMBOLS]
  }

  // 显式传入了 symbols 但全部无法识别时，返回 400 以免静默吞掉
  if (requested.length === 0) {
    if (rejected.length > 0) {
      throw createError({
        statusCode: 400,
        message: `不支持的指标：${rejected.join(', ')}`,
      })
    }
    return { metrics: buildResponse(), refreshed: [], failed: [], rejected }
  }

  const force = body?.force === true
  const cached = new Map(getMacroSnapshots(requested).map(m => [m.symbol, m]))
  const now = Date.now()

  // 仅刷新缺失或已过期的快照（手动刷新 force 时全部刷新）
  const toFetch = requested.filter((symbol) => {
    if (force)
      return true
    const snap = cached.get(symbol)
    if (!snap || !snap.fetchedAt || snap.error)
      return true
    return now - new Date(snap.fetchedAt).getTime() > CACHE_TTL_MS
  })

  const failed: string[] = []
  if (toFetch.length > 0) {
    const results = await fetchMacroMetrics(toFetch)
    for (const result of results) {
      if (result.snapshot.error === null) {
        upsertMacroSnapshot(result.snapshot, result.raw)
      }
      else {
        // 失败时保留旧快照，仅记录错误信息（不更新 fetched_at）
        failed.push(result.snapshot.symbol)
        recordMacroError(
          result.snapshot.symbol,
          macroName(result.snapshot.symbol),
          result.snapshot.error,
          result.snapshot.errorAt ?? new Date().toISOString(),
        )
      }
    }
  }

  return {
    metrics: buildResponse(),
    refreshed: toFetch,
    failed,
    rejected,
  }
})
