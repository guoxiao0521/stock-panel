import type {
  AnalysisChecklistItem,
  AnalysisInputContext,
  AnalysisMetric,
  AnalysisReport,
  AnalysisSection,
  AnalysisSkillId,
} from '#shared/types'
import { ANALYSIS_DISCLAIMER, ANALYSIS_SKILLS } from '#shared/types'
import { randomUUID } from 'node:crypto'

export interface AnalysisRunner {
  run(context: AnalysisInputContext): Promise<AnalysisReport>
}

type SepaVerdict = 'Stage 2 强势候选' | '观察名单' | '不通过'

function fmtNum(v: number | null, digits = 2): string {
  if (v == null || Number.isNaN(v))
    return '-'
  return v.toFixed(digits)
}

function fmtPct(v: number | null): string {
  if (v == null || Number.isNaN(v))
    return '-'
  const sign = v > 0 ? '+' : ''
  return `${sign}${v.toFixed(2)}%`
}

function fmtCompact(v: number | null): string {
  if (v == null || Number.isNaN(v))
    return '-'
  return Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(v)
}

function fmtMultiple(v: number | null): string {
  if (v == null || Number.isNaN(v))
    return '-'
  return `${v.toFixed(2)}x`
}

function fmtRange(low: number, high: number): string {
  if (Number.isNaN(low) || Number.isNaN(high))
    return '-'
  if (Math.abs(low - high) < 0.005)
    return fmtNum(low)
  return `${fmtNum(low)} - ${fmtNum(high)}`
}

function skillSource(skillId: AnalysisSkillId): string {
  return ANALYSIS_SKILLS.find(s => s.value === skillId)?.sourceSkill ?? skillId
}

function technicalSupportMetrics(ctx: AnalysisInputContext): AnalysisMetric[] {
  const supports = ctx.technical.supportLevels
  if (supports.length === 0) {
    return [
      { label: '技术支撑', value: '-', detail: '历史数据不足，暂无法生成均线支撑区' },
    ]
  }

  return supports.map(level => ({
    label: level.label,
    value: fmtRange(level.rangeLow, level.rangeHigh),
    detail: level.basis,
  }))
}

function relativeStrengthPass(ctx: AnalysisInputContext): boolean | null {
  const rs = ctx.relativeStrength
  if (rs.excessReturn6M == null || rs.excessReturn1Y == null)
    return null
  return rs.excessReturn6M > 0 && rs.excessReturn1Y > 0
}

function relativeStrengthDetail(ctx: AnalysisInputContext): string {
  const rs = ctx.relativeStrength
  return `相对 ${rs.benchmarkSymbol}：3M ${fmtPct(rs.excessReturn3M)} / 6M ${fmtPct(rs.excessReturn6M)} / 1Y ${fmtPct(rs.excessReturn1Y)}`
}

function buildSepaChecklist(ctx: AnalysisInputContext): AnalysisChecklistItem[] {
  const { technical: t } = ctx
  const price = t.price

  const pass = (cond: boolean | null) => cond

  return [
    {
      label: 'Price > 150MA 且 Price > 200MA',
      pass: pass(price != null && t.ma150 != null && t.ma200 != null
        ? price > t.ma150 && price > t.ma200
        : null),
      detail: `Price ${fmtNum(price)} / MA150 ${fmtNum(t.ma150)} / MA200 ${fmtNum(t.ma200)}`,
    },
    {
      label: '150MA > 200MA',
      pass: pass(t.ma150 != null && t.ma200 != null ? t.ma150 > t.ma200 : null),
      detail: `MA150 ${fmtNum(t.ma150)} / MA200 ${fmtNum(t.ma200)}`,
    },
    {
      label: '200MA 近 1 个月上升',
      pass: t.ma200Rising,
      detail: t.ma200Rising == null ? '历史数据不足' : (t.ma200Rising ? '200MA 上升' : '200MA 未上升'),
    },
    {
      label: '50MA > 150MA 且 50MA > 200MA',
      pass: pass(t.ma50 != null && t.ma150 != null && t.ma200 != null
        ? t.ma50 > t.ma150 && t.ma50 > t.ma200
        : null),
      detail: `MA50 ${fmtNum(t.ma50)} / MA150 ${fmtNum(t.ma150)} / MA200 ${fmtNum(t.ma200)}`,
    },
    {
      label: 'Price > 50MA',
      pass: pass(price != null && t.ma50 != null ? price > t.ma50 : null),
      detail: `Price ${fmtNum(price)} / MA50 ${fmtNum(t.ma50)}`,
    },
    {
      label: 'Price ≥ 52 周低点上方 30%',
      pass: pass(t.pctAbove52WeekLow != null ? t.pctAbove52WeekLow >= 30 : null),
      detail: `距 52 周低点 ${fmtPct(t.pctAbove52WeekLow)}`,
    },
    {
      label: 'Price 距 52 周高点 ≤ 25%',
      pass: pass(t.pctFrom52WeekHigh != null ? t.pctFrom52WeekHigh >= -25 : null),
      detail: `距 52 周高点 ${fmtPct(t.pctFrom52WeekHigh)}`,
    },
    {
      label: `相对 ${ctx.relativeStrength.benchmarkSymbol} 强度`,
      pass: relativeStrengthPass(ctx),
      detail: relativeStrengthPass(ctx) == null ? '相对强度数据不足' : relativeStrengthDetail(ctx),
    },
  ]
}

function sepaStageVerdict(checklist: AnalysisChecklistItem[]): { stage: string, verdict: SepaVerdict } {
  const scorable = checklist.filter(c => c.pass !== null)
  const passed = scorable.filter(c => c.pass === true).length
  const failed = scorable.filter(c => c.pass === false).length

  if (scorable.length === 0)
    return { stage: '未知', verdict: '观察名单' }

  const priceBelowMa = checklist.slice(0, 2).some(c => c.pass === false)
  if (priceBelowMa && failed >= 3)
    return { stage: 'Stage 4 或 Stage 1', verdict: '不通过' }

  if (passed >= 6)
    return { stage: 'Stage 2', verdict: 'Stage 2 强势候选' }

  if (passed >= 4)
    return { stage: 'Stage 2 候选', verdict: '观察名单' }

  return { stage: 'Stage 1/3 可能', verdict: '不通过' }
}

function buildOverviewReport(ctx: AnalysisInputContext): AnalysisReport {
  const q = ctx.quote
  const t = ctx.technical
  const name = ctx.companyName ?? ctx.symbol

  const sections: AnalysisSection[] = [
    {
      title: '行情摘要',
      kind: 'metrics',
      metrics: [
        { label: '最新价', value: fmtNum(q?.price ?? t.price) },
        { label: '日涨跌幅', value: fmtPct(q?.changePercent ?? null) },
        { label: '年初至今', value: fmtPct(q?.ytdChangePercent ?? null) },
        { label: '市盈率 (TTM)', value: fmtNum(q?.trailingPe ?? null) },
        { label: '换手率', value: fmtPct(q?.turnoverRate ?? null) },
        { label: '20 日均量', value: fmtCompact(t.avgVolume20) },
        { label: '量能倍数', value: fmtMultiple(t.volumeRatio) },
        { label: `相对 ${ctx.relativeStrength.benchmarkSymbol} 6M`, value: fmtPct(ctx.relativeStrength.excessReturn6M) },
      ],
    },
    {
      title: '技术位',
      kind: 'metrics',
      metrics: [
        { label: 'MA5', value: fmtNum(t.ma5) },
        { label: 'MA10', value: fmtNum(t.ma10) },
        { label: 'MA20', value: fmtNum(t.ma20) },
        { label: 'MA50', value: fmtNum(t.ma50) },
        { label: 'MA150', value: fmtNum(t.ma150) },
        { label: 'MA200', value: fmtNum(t.ma200) },
        { label: '52 周高', value: fmtNum(t.week52High) },
        { label: '52 周低', value: fmtNum(t.week52Low) },
        ...technicalSupportMetrics(ctx),
        { label: '近 20 日压力', value: fmtNum(t.resistanceLevel) },
      ],
    },
    {
      title: '宏观环境',
      kind: 'text',
      content: `波动率：${ctx.marketContext.volatility}；风险偏好：${ctx.marketContext.riskAppetite}；市场宽度：${ctx.marketContext.breadth}。`,
    },
  ]

  if (ctx.watchlistNote || ctx.watchlistTags.length > 0) {
    sections.push({
      title: '用户观察',
      kind: 'list',
      items: [
        ...(ctx.watchlistNote ? [`备注：${ctx.watchlistNote}`] : []),
        ...(ctx.watchlistTags.length > 0 ? [`标签：${ctx.watchlistTags.join('、')}`] : []),
      ],
    })
  }

  const trendHint = t.price != null && t.ma50 != null
    ? (t.price > t.ma50 ? '价格位于 MA50 上方，短期趋势偏多。' : '价格位于 MA50 下方，短期趋势偏弱。')
    : '技术趋势数据不足。'

  return {
    id: randomUUID(),
    symbol: ctx.symbol,
    skillId: 'overview',
    title: `${name} 综合概览`,
    summary: `${name}（${ctx.symbol}）当前价 ${fmtNum(q?.price ?? t.price)}，${trendHint}`,
    sections,
    riskFlags: ctx.dataGaps.length > 0 ? ['部分输入数据缺失，结论仅供参考'] : [],
    dataGaps: ctx.dataGaps,
    disclaimer: ANALYSIS_DISCLAIMER,
    createdAt: new Date().toISOString(),
    meta: {
      provider: 'template',
      model: null,
      skillSource: skillSource('overview'),
    },
  }
}

function buildSepaReport(ctx: AnalysisInputContext): AnalysisReport {
  const checklist = buildSepaChecklist(ctx)
  const { stage, verdict } = sepaStageVerdict(checklist)
  const name = ctx.companyName ?? ctx.symbol
  const gaps = [...ctx.dataGaps]
  if (relativeStrengthPass(ctx) == null && !gaps.includes('相对强度 benchmark 数据不可用'))
    gaps.push('相对强度数据不足')
  const riskFlags = verdict === 'Stage 2 强势候选'
    ? []
    : verdict === '观察名单'
      ? ['SEPA 条件未完全满足，仅适合继续观察']
      : ['未通过 SEPA 趋势模板或阶段不符']

  return {
    id: randomUUID(),
    symbol: ctx.symbol,
    skillId: 'sepa',
    title: `${name} SEPA 趋势分析`,
    summary: `${name} 当前判断为 ${stage}，综合结论：${verdict}。基于 Minervini 趋势模板启发式检查，RS 使用相对 ${ctx.relativeStrength.benchmarkSymbol} 的超额收益近似。`,
    sections: [
      {
        title: '阶段判断',
        kind: 'text',
        content: `识别阶段：${stage}。仅 Stage 2 通常为可研究区间；当前结论为 ${verdict}。`,
      },
      {
        title: '趋势模板（8 项）',
        kind: 'checklist',
        checklist,
      },
      {
        title: '关键价位',
        kind: 'metrics',
        metrics: [
          { label: 'Pivot 近似（20 日高）', value: fmtNum(ctx.technical.resistanceLevel) },
          { label: '止损参考（-7.5%）', value: ctx.technical.price != null ? fmtNum(ctx.technical.price * 0.925) : '-' },
          { label: '52 周高', value: fmtNum(ctx.technical.week52High) },
          { label: '52 周低', value: fmtNum(ctx.technical.week52Low) },
          { label: `相对 ${ctx.relativeStrength.benchmarkSymbol} 3M`, value: fmtPct(ctx.relativeStrength.excessReturn3M) },
          { label: `相对 ${ctx.relativeStrength.benchmarkSymbol} 6M`, value: fmtPct(ctx.relativeStrength.excessReturn6M) },
          { label: `相对 ${ctx.relativeStrength.benchmarkSymbol} 1Y`, value: fmtPct(ctx.relativeStrength.excessReturn1Y) },
        ],
      },
      {
        title: '市场环境',
        kind: 'text',
        content: `当前宏观：${ctx.marketContext.riskAppetite}（${ctx.marketContext.volatility}）。熊市环境下即使个股形态良好，突破失败率也更高。`,
      },
    ],
    riskFlags,
    dataGaps: [...new Set(gaps)],
    disclaimer: ANALYSIS_DISCLAIMER,
    createdAt: new Date().toISOString(),
    meta: {
      provider: 'template',
      model: null,
      skillSource: skillSource('sepa'),
    },
  }
}

function buildEarningsPreviewReport(ctx: AnalysisInputContext): AnalysisReport {
  const name = ctx.companyName ?? ctx.symbol
  const gaps = [
    ...ctx.dataGaps,
    '共识 EPS / Revenue 预估',
    '历史 beat/miss 记录',
    '分析师评级分布',
    '财报日期日历',
  ]

  const sections: AnalysisSection[] = [
    {
      title: '当前可得数据',
      kind: 'metrics',
      metrics: [
        { label: '最新价', value: fmtNum(ctx.quote?.price ?? ctx.technical.price) },
        { label: '预期 PE', value: fmtNum(ctx.quote?.forwardPe ?? null) },
        { label: '静态 PE', value: fmtNum(ctx.quote?.trailingPe ?? null) },
        { label: '日涨跌幅', value: fmtPct(ctx.quote?.changePercent ?? null) },
      ],
    },
    {
      title: '数据缺口说明',
      kind: 'list',
      items: [
        '完整财报预览需要 yfinance 的 earnings_estimate、revenue_estimate、earnings_history 等模块。',
        '当前版本使用模板 runner，未接入外部 LLM 或 Funda API。',
        '以下字段暂不可用，请勿据此做交易决策。',
        ...gaps.filter((g, i, arr) => arr.indexOf(g) === i),
      ],
    },
    {
      title: '后续接入建议',
      kind: 'text',
      content: '接入 finance-skills 的 earnings-preview skill 或 Funda REST API 后，可补充共识预期、beat/miss 历史与分析师情绪。',
    },
  ]

  return {
    id: randomUUID(),
    symbol: ctx.symbol,
    skillId: 'earningsPreview',
    title: `${name} 财报预览（受限）`,
    summary: `${name} 财报预览框架已就绪，但核心预估数据尚未接入。当前仅展示估值与价格上下文。`,
    sections,
    riskFlags: ['财报预览数据不完整'],
    dataGaps: [...new Set(gaps)],
    disclaimer: ANALYSIS_DISCLAIMER,
    createdAt: new Date().toISOString(),
    meta: {
      provider: 'template',
      model: null,
      skillSource: skillSource('earningsPreview'),
    },
  }
}

function buildLiquidityReport(ctx: AnalysisInputContext): AnalysisReport {
  const q = ctx.quote
  const name = ctx.companyName ?? ctx.symbol
  const turnover = q?.turnoverRate ?? null
  const volume = q?.volume ?? null
  const avgVolume20 = ctx.technical.avgVolume20
  const volumeRatio = ctx.technical.volumeRatio

  let liquidityGrade = '未知'
  if (turnover != null || volumeRatio != null) {
    if ((turnover != null && turnover >= 1) || (volumeRatio != null && volumeRatio >= 1.5))
      liquidityGrade = '活跃'
    else if ((turnover != null && turnover >= 0.2) || (volumeRatio != null && volumeRatio >= 0.8))
      liquidityGrade = '正常'
    else
      liquidityGrade = '偏低'
  }

  const flags: string[] = []
  if (turnover != null && turnover < 0.1)
    flags.push('换手率极低，可能存在流动性风险')
  if (volume == null)
    flags.push('成交量数据缺失')
  if (avgVolume20 == null)
    flags.push('成交量历史数据不足，量能判断不可用')

  return {
    id: randomUUID(),
    symbol: ctx.symbol,
    skillId: 'liquidity',
    title: `${name} 流动性分析`,
    summary: `${name} 流动性评级：${liquidityGrade}。${turnover != null ? `当日换手率 ${fmtPct(turnover)}。` : '换手率数据缺失。'}${volumeRatio != null ? ` 当前量能为 20 日均量的 ${fmtMultiple(volumeRatio)}。` : ''}`,
    sections: [
      {
        title: '流动性指标',
        kind: 'metrics',
        metrics: [
          { label: '成交量', value: volume != null ? volume.toLocaleString('en-US') : '-' },
          { label: '20 日均量', value: avgVolume20 != null ? avgVolume20.toLocaleString('en-US', { maximumFractionDigits: 0 }) : '-' },
          { label: '量能倍数', value: fmtMultiple(volumeRatio) },
          { label: '换手率', value: fmtPct(turnover) },
          { label: '市值', value: q?.marketCap != null ? `$${(q.marketCap / 1e9).toFixed(2)}B` : '-' },
          { label: '流动性评级', value: liquidityGrade },
        ],
      },
      {
        title: '观察要点',
        kind: 'list',
        items: [
          '高换手通常意味着更好的进出效率，但也可能伴随更高波动。',
          '20 日均量用于过滤单日成交量噪音，量能倍数高于 1 表示当前成交活跃度高于近期均值。',
          '低流动性股票在大额交易时可能产生更高滑点。',
          '完整流动性分析还需 bid-ask spread、Amihud 比率等，当前版本未接入。',
        ],
      },
    ],
    riskFlags: flags,
    dataGaps: ctx.dataGaps,
    disclaimer: ANALYSIS_DISCLAIMER,
    createdAt: new Date().toISOString(),
    meta: {
      provider: 'template',
      model: null,
      skillSource: skillSource('liquidity'),
    },
  }
}

/** 第一版 deterministic 模板 runner，不调用外部 LLM */
export const templateRunner: AnalysisRunner = {
  async run(context: AnalysisInputContext): Promise<AnalysisReport> {
    switch (context.skillId) {
      case 'overview':
        return buildOverviewReport(context)
      case 'sepa':
        return buildSepaReport(context)
      case 'earningsPreview':
        return buildEarningsPreviewReport(context)
      case 'liquidity':
        return buildLiquidityReport(context)
      default:
        throw new Error('UNKNOWN_SKILL')
    }
  },
}

let activeRunner: AnalysisRunner = templateRunner

export function getAnalysisRunner(): AnalysisRunner {
  return activeRunner
}

/** 供后续接入 OpenAI/Claude/Funda 等 provider 时替换 runner */
export function setAnalysisRunner(runner: AnalysisRunner) {
  activeRunner = runner
}

export async function runAnalysis(context: AnalysisInputContext): Promise<AnalysisReport> {
  return getAnalysisRunner().run(context)
}
