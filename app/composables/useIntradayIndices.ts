import type { IntradaySeries } from '#shared/types'
import { onScopeDispose, ref } from 'vue'

// 盘中刷新节奏：开盘期间高频跟随，盘后基本静止故放缓
const POLL_OPEN_MS = 60 * 1000
const POLL_CLOSED_MS = 5 * 60 * 1000

/**
 * 主要指数当日走势状态：拉取 /api/market/intraday 并按市场状态自动轮询。
 * 仅客户端轮询；标签页隐藏时暂停，恢复可见时立即刷新。
 */
export function useIntradayIndices() {
  const series = ref<IntradaySeries[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  let timer: ReturnType<typeof setTimeout> | null = null

  async function load() {
    loading.value = true
    error.value = null
    try {
      const data = await $fetch('/api/market/intraday')
      series.value = data.series as IntradaySeries[]
    }
    catch {
      error.value = '加载指数走势失败'
    }
    finally {
      loading.value = false
    }
  }

  function nextDelay(): number {
    const anyOpen = series.value.some(s => s.marketState === 'REGULAR')
    return anyOpen ? POLL_OPEN_MS : POLL_CLOSED_MS
  }

  function scheduleNext() {
    if (timer)
      clearTimeout(timer)
    if (typeof document !== 'undefined' && document.hidden)
      return
    timer = setTimeout(async () => {
      await load()
      scheduleNext()
    }, nextDelay())
  }

  function onVisibilityChange() {
    if (document.hidden) {
      if (timer)
        clearTimeout(timer)
      timer = null
    }
    else {
      // 恢复可见时立即补一次，再重新排程
      void load().then(scheduleNext)
    }
  }

  function start() {
    if (!import.meta.client)
      return
    void load().then(scheduleNext)
    document.addEventListener('visibilitychange', onVisibilityChange)
  }

  onScopeDispose(() => {
    if (timer)
      clearTimeout(timer)
    timer = null
    if (typeof document !== 'undefined')
      document.removeEventListener('visibilitychange', onVisibilityChange)
  })

  return { series, loading, error, load, start }
}
