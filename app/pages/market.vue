<script setup lang="ts">
import type { MacroMetricSnapshot } from '#shared/types'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { changeColorClass, DASH, formatPercent } from '@/lib/format'

// Phase 2 指标骨架，对应 PRD 8.2，数据接入留待 /api/market/metrics
const metrics: Pick<MacroMetricSnapshot, 'symbol' | 'name'>[] = [
  { symbol: '^VIX', name: 'VIX 恐慌指数' },
  { symbol: '^GSPC', name: 'S&P 500' },
  { symbol: '^NDX', name: 'Nasdaq 100' },
  { symbol: '^RUT', name: 'Russell 2000' },
  { symbol: '^TNX', name: '10Y 美债收益率' },
  { symbol: 'DX-Y.NYB', name: '美元指数' },
  { symbol: 'GC=F', name: '黄金' },
  { symbol: 'CL=F', name: '原油' },
]
</script>

<template>
  <div class="mx-auto max-w-screen-2xl space-y-4 px-4 py-6 lg:px-6">
    <div>
      <h1 class="text-xl font-semibold tracking-tight">宏观市场</h1>
      <p class="text-sm text-muted-foreground">
        市场环境总览，为个股观察提供风险偏好与波动率背景。（Phase 2 占位）
      </p>
    </div>

    <div class="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
      <Card v-for="m in metrics" :key="m.symbol" class="gap-2">
        <CardHeader>
          <CardDescription>{{ m.symbol }}</CardDescription>
          <CardTitle class="text-base">{{ m.name }}</CardTitle>
        </CardHeader>
        <CardContent>
          <p class="text-2xl font-semibold tabular-nums">{{ DASH }}</p>
          <p class="text-sm tabular-nums" :class="changeColorClass(null)">
            {{ formatPercent(null) }}
          </p>
        </CardContent>
      </Card>
    </div>

    <p class="text-xs text-muted-foreground">
      TODO(Phase 2)：接入 /api/market/metrics，展示最新值、日涨跌幅与短期趋势。
    </p>
  </div>
</template>
