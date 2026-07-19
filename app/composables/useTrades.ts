import type { CreateTradeBody, SymbolTradeSummary, TradeSummary, TradeWithPnl, TradesResponse } from '#shared/types'
import { computed, ref } from 'vue'

const trades = ref<TradeWithPnl[]>([])
const summary = ref<TradeSummary | null>(null)
const bySymbol = ref<SymbolTradeSummary[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
let loadedSymbol: string | null | undefined
let loadedAll = false

function applyResponse(data: TradesResponse) {
  trades.value = data.trades
  summary.value = data.summary
  bySymbol.value = data.bySymbol
}

export function useTrades() {
  const realizedPnlBySymbol = computed(() => {
    const map = new Map<string, number>()
    for (const item of bySymbol.value)
      map.set(item.symbol, item.realizedPnl)
    return map
  })

  async function load(symbol?: string, force = false) {
    const key = symbol?.toUpperCase() ?? null
    if (!force) {
      if (key && loadedSymbol === key)
        return
      if (!key && loadedAll)
        return
    }

    loading.value = true
    error.value = null
    try {
      const data = await $fetch<TradesResponse>('/api/trades', {
        query: key ? { symbol: key } : undefined,
      })
      applyResponse(data)
      loadedSymbol = key
      loadedAll = key == null
    }
    catch {
      error.value = '加载交易记录失败'
    }
    finally {
      loading.value = false
    }
  }

  async function addTrade(body: CreateTradeBody): Promise<TradesResponse> {
    const data = await $fetch<TradesResponse>('/api/trades', {
      method: 'POST',
      body,
    })
    applyResponse(data)
    loadedSymbol = body.symbol.trim().toUpperCase()
    loadedAll = false
    return data
  }

  async function removeTrade(id: string): Promise<TradesResponse> {
    const data = await $fetch<TradesResponse>(`/api/trades/${id}`, {
      method: 'DELETE',
    })
    applyResponse(data)
    loadedAll = false
    return data
  }

  function resetCache() {
    loadedSymbol = undefined
    loadedAll = false
  }

  return {
    trades,
    summary,
    bySymbol,
    realizedPnlBySymbol,
    loading,
    error,
    load,
    addTrade,
    removeTrade,
    resetCache,
  }
}
