// 宏观市场指标清单（PRD 8.2），供 service / API 共用，顺序固定。

export type MacroCategory = 'volatility' | 'index' | 'rate' | 'currency' | 'commodity'

export interface MacroMetricConfig {
  symbol: string
  name: string
  category: MacroCategory
}

export const MACRO_METRICS: MacroMetricConfig[] = [
  { symbol: '^VIX', name: 'VIX 恐慌指数', category: 'volatility' },
  { symbol: '^GSPC', name: 'S&P 500', category: 'index' },
  { symbol: '^NDX', name: 'Nasdaq 100', category: 'index' },
  { symbol: '^RUT', name: 'Russell 2000', category: 'index' },
  { symbol: '^TNX', name: '10Y 美债收益率', category: 'rate' },
  { symbol: 'DX-Y.NYB', name: '美元指数', category: 'currency' },
  { symbol: 'GC=F', name: '黄金', category: 'commodity' },
  { symbol: 'CL=F', name: '原油', category: 'commodity' },
]

export const MACRO_SYMBOLS: string[] = MACRO_METRICS.map(m => m.symbol)

const NAME_BY_SYMBOL = new Map(MACRO_METRICS.map(m => [m.symbol, m.name]))

export function macroName(symbol: string): string {
  return NAME_BY_SYMBOL.get(symbol) ?? symbol
}

// 大小写无关解析：将外部传入的 symbol 归一化为配置中的规范写法
const CANONICAL_BY_UPPER = new Map(MACRO_METRICS.map(m => [m.symbol.toUpperCase(), m.symbol]))

/** 解析受支持的指标 symbol，返回规范写法；不支持则返回 null */
export function resolveMacroSymbol(input: string): string | null {
  return CANONICAL_BY_UPPER.get(input.trim().toUpperCase()) ?? null
}
