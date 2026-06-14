// 行情数据格式化工具，对应 PRD 7.2 展示规则

/** 缺失数据统一占位符 */
export const DASH = '-'

function isMissing(value: number | null | undefined): value is null | undefined {
  return value === null || value === undefined || Number.isNaN(value)
}

/** 价格：保留 2 位小数 */
export function formatPrice(value: number | null | undefined): string {
  if (isMissing(value))
    return DASH
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/** 百分比：保留 2 位小数并带正负号 */
export function formatPercent(value: number | null | undefined): string {
  if (isMissing(value))
    return DASH
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

/** 涨跌额：保留 2 位小数并带正负号 */
export function formatChange(value: number | null | undefined): string {
  if (isMissing(value))
    return DASH
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}`
}

/** 市盈率：保留 2 位小数 */
export function formatPe(value: number | null | undefined): string {
  if (isMissing(value))
    return DASH
  return value.toFixed(2)
}

/** 大数字缩写：K / M / B / T */
export function formatCompact(value: number | null | undefined): string {
  if (isMissing(value))
    return DASH
  const abs = Math.abs(value)
  const units: [number, string][] = [
    [1e12, 'T'],
    [1e9, 'B'],
    [1e6, 'M'],
    [1e3, 'K'],
  ]
  for (const [threshold, suffix] of units) {
    if (abs >= threshold)
      return `${(value / threshold).toFixed(2)}${suffix}`
  }
  return value.toLocaleString('en-US')
}

/** 通用数字格式化（千分位） */
export function formatNumber(value: number | null | undefined): string {
  if (isMissing(value))
    return DASH
  return value.toLocaleString('en-US')
}

export type ChangeTone = 'up' | 'down' | 'neutral'

/** 根据数值返回涨跌方向 */
export function changeTone(value: number | null | undefined): ChangeTone {
  if (isMissing(value) || value === 0)
    return 'neutral'
  return value > 0 ? 'up' : 'down'
}

/** 涨跌方向对应的文字颜色类（美股惯例：涨绿跌红） */
export function changeColorClass(value: number | null | undefined): string {
  const tone = changeTone(value)
  if (tone === 'up')
    return 'text-emerald-600 dark:text-emerald-500'
  if (tone === 'down')
    return 'text-rose-600 dark:text-rose-500'
  return 'text-muted-foreground'
}

/** 友好的相对/绝对时间显示 */
export function formatDateTime(value: string | null | undefined): string {
  if (!value)
    return DASH
  const date = new Date(value)
  if (Number.isNaN(date.getTime()))
    return DASH
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
