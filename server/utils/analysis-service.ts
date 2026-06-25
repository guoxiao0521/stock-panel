import type {
  AnalysisInputContext,
  AnalysisMarketContext,
  AnalysisRelativeStrengthSummary,
  AnalysisReport,
  AnalysisSkillId,
  Candle,
  HistoryRange,
  MacroMetricSnapshot,
  RunAnalysisBody,
} from '#shared/types'
import { ANALYSIS_SKILL_IDS, HISTORY_RANGES } from '#shared/types'
import { DEFAULT_WATCHLIST_ID } from './db'
import { MACRO_SYMBOLS } from './macro-config'

const RELATIVE_STRENGTH_BENCHMARK = 'SPY'

function computeMarketContext(metrics: MacroMetricSnapshot[]): AnalysisMarketContext {
  const map = new Map(metrics.map(m => [m.symbol, m]))

  const vix = map.get('^VIX')?.value
  let volatility = '未知'
  if (vix != null) {
    if (vix < 15)
      volatility = '低波动'
    else if (vix <= 25)
      volatility = '正常'
    else
      volatility = '偏高'
  }

  const indexChanges = ['^GSPC', '^NDX', '^RUT']
    .map(s => map.get(s)?.changePercent)
    .filter((v): v is number => v != null)
  let riskAppetite = '未知'
  if (indexChanges.length > 0) {
    const up = indexChanges.filter(c => c > 0).length
    const down = indexChanges.filter(c => c < 0).length
    if (up > down)
      riskAppetite = 'Risk-on'
    else if (down > up)
      riskAppetite = 'Risk-off'
    else
      riskAppetite = '中性'
  }

  const valid = metrics.filter(m => m.changePercent != null)
  let breadth = '未知'
  if (valid.length > 0) {
    const up = valid.filter(m => (m.changePercent ?? 0) > 0).length
    const ratio = up / valid.length
    if (ratio >= 0.6)
      breadth = '偏强'
    else if (ratio <= 0.4)
      breadth = '偏弱'
    else
      breadth = '分化'
  }

  return { volatility, riskAppetite, breadth }
}

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase()
}

function isValidSkillId(skillId: string): skillId is AnalysisSkillId {
  return ANALYSIS_SKILL_IDS.includes(skillId as AnalysisSkillId)
}

function needsRelativeStrength(skillId: AnalysisSkillId): boolean {
  return skillId === 'overview' || skillId === 'sepa'
}

function returnOverTradingDays(candles: Candle[], days: number): number | null {
  if (candles.length <= days)
    return null

  const latest = candles[candles.length - 1]!
  const startIndex = candles.length - 1 - days
  const start = candles[startIndex]!
  if (latest.close <= 0 || start.close <= 0 || latest.time === start.time)
    return null

  return ((latest.close - start.close) / start.close) * 100
}

function excessReturn(
  stockCandles: Candle[],
  benchmarkCandles: Candle[],
  days: number,
): number | null {
  const stockReturn = returnOverTradingDays(stockCandles, days)
  const benchmarkReturn = returnOverTradingDays(benchmarkCandles, days)
  return stockReturn != null && benchmarkReturn != null ? stockReturn - benchmarkReturn : null
}

function computeRelativeStrength(
  stockCandles: Candle[],
  benchmarkCandles: Candle[],
): AnalysisRelativeStrengthSummary {
  return {
    benchmarkSymbol: RELATIVE_STRENGTH_BENCHMARK,
    excessReturn3M: excessReturn(stockCandles, benchmarkCandles, 63),
    excessReturn6M: excessReturn(stockCandles, benchmarkCandles, 126),
    excessReturn1Y: excessReturn(stockCandles, benchmarkCandles, 252),
  }
}

async function resolveQuote(symbol: string, forceRefresh: boolean) {
  const dataGaps: string[] = []
  let quote = getQuoteSnapshot(symbol)

  if (forceRefresh || !quote || quote.error || !quote.fetchedAt) {
    try {
      const result = await fetchQuote(symbol)
      upsertQuoteSnapshot(result.snapshot, result.raw ? JSON.stringify(result.raw) : null)
      backfillItemMeta(DEFAULT_WATCHLIST_ID, symbol, result.meta)
      quote = result.snapshot
    }
    catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      if (message === 'SYMBOL_NOT_FOUND')
        throw new Error('SYMBOL_NOT_FOUND')
      if (!quote)
        dataGaps.push('行情快照不可用')
      else if (forceRefresh)
        dataGaps.push(`行情刷新失败，使用缓存行情：${message}`)
    }
  }

  if (!quote)
    dataGaps.push('行情快照缺失')
  else if (quote.error)
    dataGaps.push(`行情刷新失败：${quote.error}`)

  return { quote, dataGaps }
}

/** 组装分析输入并调用 runner 生成报告 */
export async function runStockAnalysis(body: RunAnalysisBody): Promise<AnalysisReport> {
  if (typeof body.symbol !== 'string')
    throw new Error('SYMBOL_REQUIRED')

  const symbol = normalizeSymbol(body.symbol)
  if (!symbol)
    throw new Error('SYMBOL_REQUIRED')

  if (typeof body.skillId !== 'string' || !isValidSkillId(body.skillId))
    throw new Error('UNKNOWN_SKILL')

  const range: HistoryRange = body.range ?? '1Y'
  if (!HISTORY_RANGES.includes(range))
    throw new Error('UNKNOWN_RANGE')

  const forceRefresh = body.forceRefresh !== false

  const { quote, dataGaps: quoteGaps } = await resolveQuote(symbol, forceRefresh)
  const dataGaps = [...quoteGaps]

  let candles: Candle[] = []
  try {
    candles = await fetchHistory(symbol, range)
  }
  catch {
    dataGaps.push('历史 K 线不可用')
  }

  if (candles.length < 50)
    dataGaps.push('历史数据较短，均线与趋势判断可能不准确')

  const technical = computeTechnicalSummary(candles, quote?.volume ?? null)
  if (technical.avgVolume20 == null)
    dataGaps.push('成交量历史数据不足，量能判断不可用')

  let relativeStrength: AnalysisRelativeStrengthSummary = {
    benchmarkSymbol: RELATIVE_STRENGTH_BENCHMARK,
    excessReturn3M: null,
    excessReturn6M: null,
    excessReturn1Y: null,
  }
  if (needsRelativeStrength(body.skillId)) {
    try {
      const [relativeStockCandles, benchmarkCandles] = await Promise.all([
        range === '1Y' ? Promise.resolve(candles) : fetchHistory(symbol, '1Y'),
        fetchHistory(RELATIVE_STRENGTH_BENCHMARK, '1Y'),
      ])
      relativeStrength = computeRelativeStrength(relativeStockCandles, benchmarkCandles)
    }
    catch {
      dataGaps.push('相对强度 benchmark 数据不可用')
    }
  }

  const macroMetrics = getMacroSnapshots(MACRO_SYMBOLS)
  if (macroMetrics.every(m => m.value == null && m.error))
    dataGaps.push('宏观指标缺失')

  const marketContext = computeMarketContext(macroMetrics)
  const watchlistItem = findItemBySymbol(DEFAULT_WATCHLIST_ID, symbol)

  const context: AnalysisInputContext = {
    symbol,
    skillId: body.skillId,
    range,
    companyName: watchlistItem?.name ?? null,
    quote,
    candles,
    technical,
    relativeStrength,
    macroMetrics,
    marketContext,
    watchlistNote: watchlistItem?.note ?? null,
    watchlistTags: watchlistItem?.tags ?? [],
    dataGaps,
  }

  return runAnalysis(context)
}
