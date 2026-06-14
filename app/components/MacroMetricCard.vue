<script setup lang="ts">
import type { MacroMetricSnapshot } from '#shared/types'
import { AlertTriangleIcon } from '@lucide/vue'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { changeColorClass, DASH, formatChange, formatNumber, formatPercent } from '@/lib/format'
import Sparkline from '@/components/Sparkline.vue'

defineProps<{
  metric: MacroMetricSnapshot
}>()
</script>

<template>
  <Card class="gap-2">
    <CardHeader class="gap-0">
      <CardDescription class="text-xs">{{ metric.symbol }}</CardDescription>
      <CardTitle class="text-sm font-medium">{{ metric.name }}</CardTitle>
    </CardHeader>
    <CardContent>
      <template v-if="metric.error && metric.value == null">
        <div class="flex items-center gap-1.5 text-sm text-muted-foreground">
          <AlertTriangleIcon class="size-3.5 shrink-0" />
          <span>暂无数据</span>
        </div>
      </template>
      <template v-else>
        <div class="flex items-end justify-between gap-2">
          <div class="min-w-0">
            <p class="text-2xl font-semibold tabular-nums">
              {{ metric.value != null ? formatNumber(metric.value) : DASH }}
            </p>
            <p class="text-sm tabular-nums" :class="changeColorClass(metric.changePercent)">
              {{ formatChange(metric.change) }}（{{ formatPercent(metric.changePercent) }}）
            </p>
          </div>
          <Sparkline :points="metric.spark" class="shrink-0" />
        </div>
        <!-- 有旧值但最近刷新失败：保留数据并提示，避免“看起来已刷新”的误导 -->
        <p
          v-if="metric.error"
          class="mt-1 flex items-center gap-1 text-xs text-amber-600 dark:text-amber-500"
          :title="metric.error"
        >
          <AlertTriangleIcon class="size-3 shrink-0" />
          <span>最近刷新失败，为旧数据</span>
        </p>
      </template>
    </CardContent>
  </Card>
</template>
