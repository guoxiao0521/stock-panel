<script setup lang="ts">
import { AlertTriangleIcon } from '@lucide/vue'
import { onMounted } from 'vue'
import { toast } from 'vue-sonner'
import MacroMetricCard from '@/components/MacroMetricCard.vue'
import MarketStatusSummary from '@/components/MarketStatusSummary.vue'
import { Skeleton } from '@/components/ui/skeleton'

const { metrics, summary, loading, error, load, refresh } = useMarket()
const { updatedAt, onRefresh } = useAppHeader()

// 注册顶部刷新按钮（手动刷新忽略缓存）
onRefresh(async () => {
  const result = await refresh(true)
  updatedAt.value = new Date().toISOString()
  if (!result.ok)
    toast.error('刷新宏观指标失败')
  else if (result.failed.length > 0)
    toast.warning(`部分指标刷新失败：${result.failed.join('、')}，已保留旧数据`)
  else
    toast.success('宏观指标已刷新')
})

onMounted(async () => {
  // 首屏优先展示缓存，再异步刷新过期指标（PRD 10.2 / 15）
  await load()
  updatedAt.value = new Date().toISOString()
  const result = await refresh(false)
  updatedAt.value = new Date().toISOString()
  if (result.ok && result.failed.length > 0)
    toast.warning(`部分指标刷新失败：${result.failed.join('、')}，已保留旧数据`)
})
</script>

<template>
  <div class="mx-auto max-w-screen-2xl space-y-4 px-4 py-6 lg:px-6">
    <div>
      <h1 class="text-xl font-semibold tracking-tight">宏观市场</h1>
      <p class="text-sm text-muted-foreground">
        市场环境总览，为个股观察提供风险偏好与波动率背景。
      </p>
    </div>

    <div
      v-if="error"
      class="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
    >
      <AlertTriangleIcon class="size-4 shrink-0" />
      <span>{{ error }}，已保留现有数据。</span>
    </div>

    <MarketStatusSummary :summary="summary" />

    <template v-if="metrics.length > 0">
      <div class="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        <MacroMetricCard v-for="m in metrics" :key="m.symbol" :metric="m" />
      </div>
    </template>
    <div v-else class="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
      <Skeleton v-for="i in 8" :key="i" class="h-28 w-full rounded-xl" />
    </div>

    <p class="text-xs text-muted-foreground">
      数据来源：Yahoo Finance，可能延迟或缺失。市场状态判断为启发式参考，仅供研究，不构成投资建议。
    </p>
  </div>
</template>
