import type { MacroMetricSnapshot } from '#shared/types'

// 市场状态摘要（PRD 8.3）。轻量启发式，仅供研究参考，不构成投资建议。

export type StatusTone = 'positive' | 'negative' | 'neutral'

export interface StatusItem {
  label: string
  value: string
  detail: string
  tone: StatusTone
}

export interface MarketStatusSummary {
  volatility: StatusItem
  riskAppetite: StatusItem
  breadth: StatusItem
}

// 风险偏好参考的主要股指
const RISK_INDEXES = ['^GSPC', '^NDX', '^RUT']

function bySymbol(metrics: MacroMetricSnapshot[]): Map<string, MacroMetricSnapshot> {
  return new Map(metrics.map(m => [m.symbol, m]))
}

/** 波动率环境：基于 VIX 绝对水平 */
function volatilityStatus(vix: MacroMetricSnapshot | undefined): StatusItem {
  const v = vix?.value
  if (v == null) {
    return { label: '波动率环境', value: '未知', detail: 'VIX 数据缺失', tone: 'neutral' }
  }
  if (v < 15)
    return { label: '波动率环境', value: '低波动', detail: `VIX ${v.toFixed(2)}，市场平静`, tone: 'positive' }
  if (v <= 25)
    return { label: '波动率环境', value: '正常', detail: `VIX ${v.toFixed(2)}，波动适中`, tone: 'neutral' }
  return { label: '波动率环境', value: '偏高', detail: `VIX ${v.toFixed(2)}，避险情绪升温`, tone: 'negative' }
}

/** 风险偏好：主要股指日涨跌方向多数决 */
function riskAppetiteStatus(map: Map<string, MacroMetricSnapshot>): StatusItem {
  const changes = RISK_INDEXES
    .map(s => map.get(s)?.changePercent)
    .filter((v): v is number => v != null)

  if (changes.length === 0)
    return { label: '风险偏好', value: '未知', detail: '股指数据缺失', tone: 'neutral' }

  const up = changes.filter(c => c > 0).length
  const down = changes.filter(c => c < 0).length
  const detail = `${changes.length} 项股指中 ${up} 涨 ${down} 跌`

  if (up > down)
    return { label: '风险偏好', value: 'Risk-on', detail, tone: 'positive' }
  if (down > up)
    return { label: '风险偏好', value: 'Risk-off', detail, tone: 'negative' }
  return { label: '风险偏好', value: '中性', detail, tone: 'neutral' }
}

/** 市场宽度：全部指标中上涨数量占比 */
function breadthStatus(metrics: MacroMetricSnapshot[]): StatusItem {
  const valid = metrics.filter(m => m.changePercent != null)
  if (valid.length === 0)
    return { label: '市场宽度', value: '未知', detail: '指标数据缺失', tone: 'neutral' }

  const up = valid.filter(m => (m.changePercent ?? 0) > 0).length
  const ratio = up / valid.length
  const detail = `${valid.length} 项指标中 ${up} 项上涨`

  if (ratio >= 0.6)
    return { label: '市场宽度', value: '偏强', detail, tone: 'positive' }
  if (ratio <= 0.4)
    return { label: '市场宽度', value: '偏弱', detail, tone: 'negative' }
  return { label: '市场宽度', value: '分化', detail, tone: 'neutral' }
}

export function computeMarketStatus(metrics: MacroMetricSnapshot[]): MarketStatusSummary {
  const map = bySymbol(metrics)
  return {
    volatility: volatilityStatus(map.get('^VIX')),
    riskAppetite: riskAppetiteStatus(map),
    breadth: breadthStatus(metrics),
  }
}

/** 状态色：风险偏好/宽度用涨绿跌红，波动率正向（低波动）同样视为利好 */
export function statusToneClass(tone: StatusTone): string {
  if (tone === 'positive')
    return 'text-emerald-600 dark:text-emerald-500'
  if (tone === 'negative')
    return 'text-rose-600 dark:text-rose-500'
  return 'text-muted-foreground'
}
