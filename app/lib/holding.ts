import type { WatchlistRow } from '#shared/types'

export interface HoldingMetrics {
  marketValue: number | null
  unrealizedPnl: number | null
  unrealizedPnlPercent: number | null
  breakEvenPrice: number | null
  requiredRecoveryGainPercent: number | null
  breakEvenMarketValue: number | null
}

export interface CurrencyPortfolioSummary {
  currency: string
  totalMarketValue: number | null
  totalUnrealizedPnl: number | null
  totalUnrealizedPnlPercent: number | null
  marketValueCount: number
  pnlCount: number
  incompleteCount: number
}

export interface PortfolioHoldingSummary {
  byCurrency: CurrencyPortfolioSummary[]
  isMultiCurrency: boolean
}

function isPositive(value: number | null | undefined): value is number {
  return value != null && Number.isFinite(value) && value > 0
}

/** 持仓汇总使用的币种；缺失时默认 USD（与当前美股场景一致） */
export function resolveHoldingCurrency(row: WatchlistRow | null | undefined): string {
  return row?.currency?.trim().toUpperCase() || 'USD'
}

export function calculateHoldingMetrics(row: WatchlistRow | null | undefined): HoldingMetrics {
  const price = row?.quote?.price
  const costPrice = row?.costPrice
  const shareCount = row?.shareCount

  const hasMarketValue = isPositive(price) && isPositive(shareCount)
  const hasPnl = hasMarketValue && isPositive(costPrice)

  if (!hasMarketValue) {
    return {
      marketValue: null,
      unrealizedPnl: null,
      unrealizedPnlPercent: null,
      breakEvenPrice: null,
      requiredRecoveryGainPercent: null,
      breakEvenMarketValue: null,
    }
  }

  const marketValue = price * shareCount

  if (!hasPnl) {
    return {
      marketValue,
      unrealizedPnl: null,
      unrealizedPnlPercent: null,
      breakEvenPrice: null,
      requiredRecoveryGainPercent: null,
      breakEvenMarketValue: null,
    }
  }

  return {
    marketValue,
    unrealizedPnl: (price - costPrice) * shareCount,
    unrealizedPnlPercent: ((price - costPrice) / costPrice) * 100,
    breakEvenPrice: costPrice,
    requiredRecoveryGainPercent: Math.max(0, ((costPrice / price) - 1) * 100),
    breakEvenMarketValue: costPrice * shareCount,
  }
}

interface CurrencyAccumulator {
  totalMarketValue: number
  totalUnrealizedPnl: number
  totalCostBasis: number
  marketValueCount: number
  pnlCount: number
  incompleteCount: number
}

function createAccumulator(): CurrencyAccumulator {
  return {
    totalMarketValue: 0,
    totalUnrealizedPnl: 0,
    totalCostBasis: 0,
    marketValueCount: 0,
    pnlCount: 0,
    incompleteCount: 0,
  }
}

function toCurrencySummary(currency: string, acc: CurrencyAccumulator): CurrencyPortfolioSummary {
  return {
    currency,
    totalMarketValue: acc.marketValueCount > 0 ? acc.totalMarketValue : null,
    totalUnrealizedPnl: acc.pnlCount > 0 ? acc.totalUnrealizedPnl : null,
    totalUnrealizedPnlPercent: acc.pnlCount > 0 && acc.totalCostBasis > 0
      ? (acc.totalUnrealizedPnl / acc.totalCostBasis) * 100
      : null,
    marketValueCount: acc.marketValueCount,
    pnlCount: acc.pnlCount,
    incompleteCount: acc.incompleteCount,
  }
}

export function calculatePortfolioHoldingSummary(rows: WatchlistRow[]): PortfolioHoldingSummary {
  const buckets = new Map<string, CurrencyAccumulator>()

  for (const row of rows) {
    const currency = resolveHoldingCurrency(row)
    const bucket = buckets.get(currency) ?? createAccumulator()
    const metrics = calculateHoldingMetrics(row)
    const hasShareCount = isPositive(row.shareCount)
    const hasCostPrice = isPositive(row.costPrice)
    const hasPrice = isPositive(row.quote?.price)

    if (metrics.marketValue != null) {
      bucket.totalMarketValue += metrics.marketValue
      bucket.marketValueCount += 1
    }

    if (metrics.unrealizedPnl != null) {
      bucket.totalUnrealizedPnl += metrics.unrealizedPnl
      bucket.totalCostBasis += row.costPrice! * row.shareCount!
      bucket.pnlCount += 1
    }

    if (hasShareCount && (!hasPrice || !hasCostPrice))
      bucket.incompleteCount += 1

    buckets.set(currency, bucket)
  }

  const byCurrency = [...buckets.entries()]
    .map(([currency, acc]) => toCurrencySummary(currency, acc))
    .filter(section => section.marketValueCount > 0 || section.pnlCount > 0 || section.incompleteCount > 0)
    .sort((a, b) => a.currency.localeCompare(b.currency))

  const activeCurrencies = byCurrency.filter(
    section => section.marketValueCount > 0 || section.pnlCount > 0,
  )

  return {
    byCurrency,
    isMultiCurrency: activeCurrencies.length > 1,
  }
}
