import type { MacroMetricSnapshot } from '#shared/types'
import { computed, ref } from 'vue'
import { computeMarketStatus } from '@/lib/market-status'

export interface RefreshResult {
  ok: boolean
  /** 单只刷新失败的 symbol（保留旧数据） */
  failed: string[]
}

/**
 * 宏观市场状态管理（接入 server API，Phase 2）。
 * 首屏读取 /api/market/metrics 缓存，再调用 /api/market/refresh 刷新过期数据。
 */
export function useMarket() {
  const metrics = ref<MacroMetricSnapshot[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const summary = computed(() => computeMarketStatus(metrics.value))

  async function load() {
    loading.value = true
    error.value = null
    try {
      const data = await $fetch('/api/market/metrics')
      metrics.value = data.metrics as MacroMetricSnapshot[]
    }
    catch {
      error.value = '加载宏观指标失败'
    }
    finally {
      loading.value = false
    }
  }

  /**
   * 刷新指标。force=true 时忽略缓存全部重新拉取（手动刷新）。
   * 返回结果中包含单只失败的 symbol，便于上层提示“部分刷新失败”。
   */
  async function refresh(force = false): Promise<RefreshResult> {
    loading.value = true
    error.value = null
    try {
      const data = await $fetch('/api/market/refresh', {
        method: 'POST',
        body: { force },
      })
      metrics.value = data.metrics as MacroMetricSnapshot[]
      const failed = (data.failed as string[] | undefined) ?? []
      return { ok: true, failed }
    }
    catch {
      error.value = '刷新宏观指标失败'
      return { ok: false, failed: [] }
    }
    finally {
      loading.value = false
    }
  }

  return {
    metrics,
    summary,
    loading,
    error,
    load,
    refresh,
  }
}
