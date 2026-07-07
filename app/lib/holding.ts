import type { WatchlistRow } from '#shared/types'

export interface HoldingMetrics {
  marketValue: number | null
  unrealizedPnl: number | null
  unrealizedPnlPercent: number | null
}

export function calculateHoldingMetrics(row: WatchlistRow | null | undefined): HoldingMetrics {
  const price = row?.quote?.price
  const costPrice = row?.costPrice
  const shareCount = row?.shareCount

  if (
    price == null
    || costPrice == null
    || shareCount == null
    || price <= 0
    || costPrice <= 0
    || shareCount <= 0
  ) {
    return {
      marketValue: null,
      unrealizedPnl: null,
      unrealizedPnlPercent: null,
    }
  }

  return {
    marketValue: price * shareCount,
    unrealizedPnl: (price - costPrice) * shareCount,
    unrealizedPnlPercent: ((price - costPrice) / costPrice) * 100,
  }
}
