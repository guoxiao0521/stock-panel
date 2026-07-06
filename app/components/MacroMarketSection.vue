<script setup lang="ts">
import type { IntradaySeries, MacroMetricSnapshot } from '#shared/types'
import type { MarketStatusSummary as MarketSummaryType } from '@/lib/market-status'
import { AlertTriangleIcon, ChevronDownIcon } from '@lucide/vue'
import { useStorage } from '@vueuse/core'
import IntradayIndexCard from '@/components/IntradayIndexCard.vue'
import MacroMetricCard from '@/components/MacroMetricCard.vue'
import MarketStatusSummary from '@/components/MarketStatusSummary.vue'
import { Skeleton } from '@/components/ui/skeleton'

defineProps<{
  metrics: MacroMetricSnapshot[]
  summary: MarketSummaryType
  indexSeries: IntradaySeries[]
  error: string | null
}>()

// 折叠状态持久化，默认展开
const collapsed = useStorage('stock-panel-macro-collapsed', false)
</script>

<template>
  <div class="rounded-lg border bg-card">
    <!-- 标题栏（始终可见） -->
    <div class="flex items-center justify-between px-4 py-3">
      <div>
        <h2 class="text-sm font-semibold">宏观市场</h2>
        <p class="text-xs text-muted-foreground">
          市场环境总览，为个股观察提供风险偏好与波动率背景。
        </p>
      </div>
      <button
        class="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        @click="collapsed = !collapsed"
      >
        {{ collapsed ? '展开' : '收起' }}
        <ChevronDownIcon
          class="size-3.5 transition-transform duration-200"
          :class="{ 'rotate-180': !collapsed }"
        />
      </button>
    </div>

    <!-- 内容区（可折叠） -->
    <div v-show="!collapsed" class="space-y-4 px-4 pb-4">
      <div
        v-if="error"
        class="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
      >
        <AlertTriangleIcon class="size-4 shrink-0" />
        <span>{{ error }}，已保留现有数据。</span>
      </div>

      <section class="space-y-2">
        <h3 class="text-xs font-medium text-muted-foreground">主要指数当日走势</h3>
        <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
          <template v-if="indexSeries.length > 0">
            <IntradayIndexCard v-for="s in indexSeries" :key="s.symbol" :series="s" />
          </template>
          <Skeleton v-for="i in 3" v-else :key="i" class="h-64 w-full rounded-xl" />
        </div>
      </section>

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
  </div>
</template>
