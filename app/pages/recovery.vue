<script setup lang="ts">
import { ArrowLeftIcon, CalculatorIcon, TrendingUpIcon } from '@lucide/vue'
import { computed, ref } from 'vue'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface RecoveryReference {
  drawdown: number
  requiredGain: number
}

const recoveryReferences: RecoveryReference[] = [
  { drawdown: 5, requiredGain: 5.26 },
  { drawdown: 10, requiredGain: 11.11 },
  { drawdown: 15, requiredGain: 17.65 },
  { drawdown: 20, requiredGain: 25 },
  { drawdown: 25, requiredGain: 33.33 },
  { drawdown: 30, requiredGain: 42.86 },
  { drawdown: 35, requiredGain: 53.85 },
  { drawdown: 40, requiredGain: 66.67 },
  { drawdown: 45, requiredGain: 81.82 },
  { drawdown: 50, requiredGain: 100 },
  { drawdown: 55, requiredGain: 122.22 },
  { drawdown: 60, requiredGain: 150 },
  { drawdown: 65, requiredGain: 185.71 },
  { drawdown: 70, requiredGain: 233.33 },
  { drawdown: 75, requiredGain: 300 },
  { drawdown: 80, requiredGain: 400 },
  { drawdown: 85, requiredGain: 566.67 },
  { drawdown: 90, requiredGain: 900 },
  { drawdown: 95, requiredGain: 1900 },
]

const drawdownInput = ref<string | number>(30)

const drawdown = computed(() => Number(drawdownInput.value))
const isValidDrawdown = computed(() =>
  Number.isFinite(drawdown.value) && drawdown.value > 0 && drawdown.value < 100,
)
const remainingPrincipal = computed(() => isValidDrawdown.value ? 100 - drawdown.value : null)
const requiredGain = computed(() =>
  isValidDrawdown.value
    ? drawdown.value / (100 - drawdown.value) * 100
    : null,
)

function formatPercent(value: number | null): string {
  if (value === null)
    return '-'
  return `${value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
}
</script>

<template>
  <div class="mx-auto max-w-6xl space-y-6 px-4 py-6 lg:px-6">
    <Button as-child variant="ghost" size="sm" class="-ml-2 text-muted-foreground">
      <NuxtLink to="/">
        <ArrowLeftIcon class="size-4" />
        返回自选股
      </NuxtLink>
    </Button>

    <div class="max-w-2xl space-y-1">
      <h1 class="text-xl font-semibold tracking-tight">跌幅回本计算</h1>
      <p class="text-sm leading-6 text-muted-foreground">
        下跌与回本并不对称。跌幅越深，需要的上涨幅度会加速扩大。
      </p>
    </div>

    <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
      <Card class="order-2 lg:order-1">
        <CardHeader class="border-b">
          <CardTitle class="flex items-center gap-2 text-base">
            <TrendingUpIcon class="size-4 text-primary" />
            涨幅速查表
          </CardTitle>
          <CardDescription>以当前价格为基准，显示回到下跌前价格所需的涨幅。</CardDescription>
        </CardHeader>
        <CardContent class="px-0">
          <Table>
            <TableHeader>
              <TableRow class="bg-muted/50">
                <TableHead class="px-4">下跌幅度</TableHead>
                <TableHead class="px-4 text-right">回本所需上涨幅度</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="item in recoveryReferences" :key="item.drawdown">
                <TableCell class="px-4 font-medium tabular-nums text-rose-600 dark:text-rose-500">
                  -{{ item.drawdown }}%
                </TableCell>
                <TableCell class="px-4 text-right font-medium tabular-nums text-emerald-600 dark:text-emerald-500">
                  +{{ item.requiredGain.toFixed(2) }}%
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div class="order-1 space-y-4 lg:order-2 lg:sticky lg:top-20">
        <Card>
          <CardHeader>
            <CardTitle class="flex items-center gap-2 text-base">
              <CalculatorIcon class="size-4 text-primary" />
              输入跌幅计算
            </CardTitle>
            <CardDescription>输入 0 到 100 之间的跌幅百分比。</CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="space-y-2">
              <Label for="recovery-drawdown">下跌幅度</Label>
              <div class="relative">
                <Input
                  id="recovery-drawdown"
                  v-model="drawdownInput"
                  type="number"
                  inputmode="decimal"
                  min="0.01"
                  max="99.99"
                  step="0.01"
                  class="h-11 pr-8 tabular-nums md:h-9"
                  :aria-invalid="!isValidDrawdown"
                />
                <span class="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-sm text-muted-foreground">%</span>
              </div>
              <p v-if="!isValidDrawdown" class="text-xs text-destructive" role="alert">
                请输入大于 0 且小于 100 的跌幅。
              </p>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div class="rounded-lg border bg-muted/30 p-3">
                <p class="text-xs text-muted-foreground">本金 100 元剩余</p>
                <p class="mt-1 text-lg font-semibold tabular-nums">
                  {{ remainingPrincipal === null ? '-' : `${remainingPrincipal.toFixed(2)} 元` }}
                </p>
              </div>
              <div class="rounded-lg border bg-muted/30 p-3">
                <p class="text-xs text-muted-foreground">回本所需涨幅</p>
                <p class="mt-1 text-lg font-semibold tabular-nums text-emerald-600 dark:text-emerald-500">
                  {{ formatPercent(requiredGain) }}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle class="text-base">计算方式</CardTitle>
          </CardHeader>
          <CardContent class="space-y-4 text-sm leading-6">
            <div class="rounded-lg border bg-muted/30 px-3 py-2 text-center font-mono text-xs sm:text-sm">
              回本所需涨幅 = 下跌幅度 / (1 - 下跌幅度)
            </div>
            <p class="text-muted-foreground">
              例如本金 100 元，下跌 70% 后剩 30 元；从 30 元涨回 100 元，需要上涨
              <span class="font-medium tabular-nums text-foreground">(100 - 30) / 30 = 233.33%</span>。
            </p>
          </CardContent>
        </Card>

        <p class="px-1 text-xs leading-5 text-muted-foreground">
          本工具仅用于解释涨跌幅关系，不包含交易费用、税费或追加资金的影响。
        </p>
      </div>
    </div>
  </div>
</template>
