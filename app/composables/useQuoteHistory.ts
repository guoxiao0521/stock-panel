import type { Ref } from 'vue'
import type { Candle, HistoryRange } from '#shared/types'
import { ref, watch } from 'vue'

/**
 * 单只股票历史 K 线数据获取（股票详情页 K 线图）。
 * 使用递增 token 丢弃过期请求（快速切换 symbol/区间时）。
 */
export function useQuoteHistory(symbol: Ref<string | null | undefined>, range: Ref<HistoryRange>) {
  const candles = ref<Candle[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  let token = 0

  async function load() {
    const targetSymbol = symbol.value
    if (!targetSymbol) {
      candles.value = []
      return
    }
    const current = ++token
    loading.value = true
    error.value = null
    try {
      const data = await $fetch('/api/quotes/history', {
        query: { symbol: targetSymbol, range: range.value },
      })
      if (current !== token)
        return
      candles.value = data.candles as Candle[]
    }
    catch {
      if (current !== token)
        return
      candles.value = []
      error.value = '历史数据加载失败'
    }
    finally {
      if (current === token)
        loading.value = false
    }
  }

  watch([symbol, range], load, { immediate: true })

  return { candles, loading, error }
}
