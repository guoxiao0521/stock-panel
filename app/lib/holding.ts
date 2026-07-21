import type { WatchlistRow } from '#shared/types'

export interface HoldingMetrics {
  costBasis: number | null
  marketValue: number | null
  unrealizedPnl: number | null
  unrealizedPnlPercent: number | null
  breakEvenPrice: number | null
  requiredRecoveryGainPercent: number | null
  breakEvenMarketValue: number | null
}

export interface CurrencyPortfolioSummary {
  currency: string
  totalCostBasis: number | null
  totalMarketValue: number | null
  totalUnrealizedPnl: number | null
  totalUnrealizedPnlPercent: number | null
  costBasisCount: number
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

  const hasCostBasis = isPositive(costPrice) && isPositive(shareCount)
  const hasMarketValue = isPositive(price) && isPositive(shareCount)
  const hasPnl = hasMarketValue && hasCostBasis
  const costBasis = hasCostBasis ? costPrice * shareCount : null

  if (!hasMarketValue) {
    return {
      costBasis,
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
      costBasis,
      marketValue,
      unrealizedPnl: null,
      unrealizedPnlPercent: null,
      breakEvenPrice: null,
      requiredRecoveryGainPercent: null,
      breakEvenMarketValue: null,
    }
  }

  return {
    costBasis,
    marketValue,
    unrealizedPnl: (price - costPrice) * shareCount,
    unrealizedPnlPercent: ((price - costPrice) / costPrice) * 100,
    breakEvenPrice: costPrice,
    requiredRecoveryGainPercent: Math.max(0, ((costPrice / price) - 1) * 100),
    breakEvenMarketValue: costBasis,
  }
}

interface CurrencyAccumulator {
  totalMarketValue: number
  totalUnrealizedPnl: number
  totalCostBasis: number
  pnlCostBasis: number
  costBasisCount: number
  marketValueCount: number
  pnlCount: number
  incompleteCount: number
}

function createAccumulator(): CurrencyAccumulator {
  return {
    totalMarketValue: 0,
    totalUnrealizedPnl: 0,
    totalCostBasis: 0,
    pnlCostBasis: 0,
    costBasisCount: 0,
    marketValueCount: 0,
    pnlCount: 0,
    incompleteCount: 0,
  }
}

function toCurrencySummary(currency: string, acc: CurrencyAccumulator): CurrencyPortfolioSummary {
  return {
    currency,
    totalCostBasis: acc.costBasisCount > 0 ? acc.totalCostBasis : null,
    totalMarketValue: acc.marketValueCount > 0 ? acc.totalMarketValue : null,
    totalUnrealizedPnl: acc.pnlCount > 0 ? acc.totalUnrealizedPnl : null,
    totalUnrealizedPnlPercent: acc.pnlCount > 0 && acc.pnlCostBasis > 0
      ? (acc.totalUnrealizedPnl / acc.pnlCostBasis) * 100
      : null,
    costBasisCount: acc.costBasisCount,
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

    if (metrics.costBasis != null) {
      bucket.totalCostBasis += metrics.costBasis
      bucket.costBasisCount += 1
    }

    if (metrics.marketValue != null) {
      bucket.totalMarketValue += metrics.marketValue
      bucket.marketValueCount += 1
    }

    if (metrics.unrealizedPnl != null) {
      bucket.totalUnrealizedPnl += metrics.unrealizedPnl
      bucket.pnlCostBasis += metrics.costBasis!
      bucket.pnlCount += 1
    }

    if (hasShareCount && (!hasPrice || !hasCostPrice))
      bucket.incompleteCount += 1

    buckets.set(currency, bucket)
  }

  const byCurrency = [...buckets.entries()]
    .map(([currency, acc]) => toCurrencySummary(currency, acc))
    .filter(section => section.costBasisCount > 0 || section.marketValueCount > 0 || section.pnlCount > 0 || section.incompleteCount > 0)
    .sort((a, b) => a.currency.localeCompare(b.currency))

  const activeCurrencies = byCurrency.filter(
    section => section.costBasisCount > 0 || section.marketValueCount > 0 || section.pnlCount > 0,
  )

  return {
    byCurrency,
    isMultiCurrency: activeCurrencies.length > 1,
  }
}
