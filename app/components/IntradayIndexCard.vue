<script setup lang="ts">
import type { IntradaySeries } from '#shared/types'
import { AlertTriangleIcon } from '@lucide/vue'
import IntradayChart from '@/components/IntradayChart.vue'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { changeColorClass, DASH, formatChange, formatNumber, formatPercent } from '@/lib/format'

defineProps<{
  series: IntradaySeries
}>()
</script>

<template>
  <Card class="gap-2">
    <CardHeader class="gap-0">
      <CardDescription class="text-xs">{{ series.symbol }}</CardDescription>
      <div class="flex items-end justify-between gap-2">
        <CardTitle class="text-sm font-medium">{{ series.name }}</CardTitle>
        <div v-if="series.last != null" class="text-right">
          <p class="text-lg font-semibold tabular-nums leading-none">
            {{ formatNumber(series.last) }}
          </p>
          <p class="text-xs tabular-nums" :class="changeColorClass(series.changePercent)">
            {{ formatChange(series.change) }}（{{ formatPercent(series.changePercent) }}）
          </p>
        </div>
      </div>
    </CardHeader>
    <CardContent>
      <template v-if="series.points.length > 0">
        <ClientOnly>
          <IntradayChart
            :points="series.points"
            :previous-close="series.previousClose"
            :gmt-offset="series.gmtOffset"
          />
          <template #fallback>
            <div class="flex h-40 items-center justify-center text-sm text-muted-foreground">
              加载中…
            </div>
          </template>
        </ClientOnly>
      </template>
      <div
        v-else
        class="flex h-40 items-center justify-center gap-1.5 text-sm text-muted-foreground"
      >
        <AlertTriangleIcon v-if="series.error" class="size-3.5 shrink-0" />
        <span>{{ series.error ? '暂无数据' : '加载中…' }}</span>
      </div>
      <!-- 有曲线但最近刷新失败：保留旧数据并提示 -->
      <p
        v-if="series.error && series.points.length > 0"
        class="mt-1 flex items-center gap-1 text-xs text-amber-600 dark:text-amber-500"
        :title="series.error"
      >
        <AlertTriangleIcon class="size-3 shrink-0" />
        <span>最近刷新失败，为旧数据</span>
      </p>
    </CardContent>
  </Card>
</template>
