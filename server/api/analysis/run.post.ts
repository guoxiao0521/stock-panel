import type { AnalysisSkillId, HistoryRange, RunAnalysisBody, RunAnalysisResponse } from '#shared/types'
import { ANALYSIS_SKILL_IDS, HISTORY_RANGES } from '#shared/types'

function isAnalysisSkillId(value: string): value is AnalysisSkillId {
  return ANALYSIS_SKILL_IDS.includes(value as AnalysisSkillId)
}

function isHistoryRange(value: string): value is HistoryRange {
  return HISTORY_RANGES.includes(value as HistoryRange)
}

/** POST /api/analysis/run — 触发个股 AI 分析（模板 runner） */
export default defineEventHandler(async (event) => {
  const rawBody = await readBody<unknown>(event).catch(() => null)
  const body = rawBody && typeof rawBody === 'object' && !Array.isArray(rawBody)
    ? rawBody as Record<string, unknown>
    : {}

  if (typeof body.symbol !== 'string' || !body.symbol.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'symbol is required' })
  }

  if (body.skillId == null || body.skillId === '') {
    throw createError({ statusCode: 400, statusMessage: 'skillId is required' })
  }

  if (typeof body.skillId !== 'string' || !isAnalysisSkillId(body.skillId)) {
    throw createError({ statusCode: 400, statusMessage: 'unknown skillId' })
  }

  let range: HistoryRange = '1Y'
  if (body.range != null) {
    if (typeof body.range !== 'string' || !isHistoryRange(body.range)) {
      throw createError({ statusCode: 400, statusMessage: 'unknown range' })
    }
    range = body.range
  }

  if (body.forceRefresh != null && typeof body.forceRefresh !== 'boolean') {
    throw createError({ statusCode: 400, statusMessage: 'forceRefresh must be boolean' })
  }

  const analysisBody: RunAnalysisBody = {
    symbol: body.symbol.trim().toUpperCase(),
    skillId: body.skillId,
    range,
    forceRefresh: body.forceRefresh !== false,
  }

  const watchlistId = await resolveWatchlistId(event)

  try {
    const report = await runStockAnalysis(analysisBody, watchlistId)
    return { report } satisfies RunAnalysisResponse
  }
  catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    if (message === 'SYMBOL_NOT_FOUND') {
      throw createError({ statusCode: 404, statusMessage: 'symbol not found' })
    }
    if (message === 'UNKNOWN_SKILL') {
      throw createError({ statusCode: 400, statusMessage: 'unknown skillId' })
    }
    if (message === 'UNKNOWN_RANGE') {
      throw createError({ statusCode: 400, statusMessage: 'unknown range' })
    }
    if (message === 'SYMBOL_REQUIRED') {
      throw createError({ statusCode: 400, statusMessage: 'symbol is required' })
    }
    throw createError({ statusCode: 500, statusMessage: 'analysis failed' })
  }
})
