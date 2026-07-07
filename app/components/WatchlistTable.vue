<script setup lang="ts">
import type { WatchlistRow } from '#shared/types'
import { AlertCircleIcon, Trash2Icon } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  changeColorClass,
  DASH,
  formatChange,
  formatCompact,
  formatDateTime,
  formatMoney,
  formatPe,
  formatPercent,
  formatShares,
  formatSignedMoney,
} from '@/lib/format'
import { calculateHoldingMetrics, resolveHoldingCurrency } from '@/lib/holding'

defineProps<{
  rows: WatchlistRow[]
  loading?: boolean
}>()

const emit = defineEmits<{
  remove: [id: string]
}>()

function turnover(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value))
    return DASH
  return `${value.toFixed(2)}%`
}
</script>

<template>
  <div class="overflow-x-auto rounded-lg border">
    <Table>
      <TableHeader>
        <TableRow class="bg-muted/50">
          <TableHead class="sticky left-0 z-10 bg-muted/50">代码</TableHead>
          <TableHead>名称</TableHead>
          <TableHead class="text-right">最新价</TableHead>
          <TableHead class="text-right">成本价</TableHead>
          <TableHead class="text-right">持股数</TableHead>
          <TableHead class="text-right">持仓市值</TableHead>
          <TableHead class="text-right">浮动盈亏</TableHead>
          <TableHead class="text-right">盈亏率</TableHead>
          <TableHead class="text-right">净值</TableHead>
          <TableHead class="text-right">折溢价</TableHead>
          <TableHead class="text-right">日涨跌额</TableHead>
          <TableHead class="text-right">日涨跌幅</TableHead>
          <TableHead class="text-right">年初至今</TableHead>
          <TableHead class="text-right">成交量</TableHead>
          <TableHead class="text-right">换手率</TableHead>
          <TableHead class="text-right">市盈率</TableHead>
          <TableHead class="text-right">市值</TableHead>
          <TableHead>标签</TableHead>
          <TableHead class="text-right">更新时间</TableHead>
          <TableHead class="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow
          v-for="row in rows"
          :key="row.id"
          class="cursor-pointer"
          @click="navigateTo(`/stock/${row.symbol}`)"
        >
          <TableCell class="sticky left-0 z-10 bg-background font-medium">
            <div class="flex items-center gap-1">
              <span>{{ row.symbol }}</span>
              <AlertCircleIcon
                v-if="row.quote?.error"
                class="size-3.5 text-destructive"
                :title="row.quote.error"
              />
            </div>
          </TableCell>
          <TableCell class="max-w-40 truncate text-muted-foreground">
            {{ row.name ?? DASH }}
          </TableCell>
          <TableCell class="text-right tabular-nums">
            <Skeleton v-if="loading && !row.quote" class="ml-auto h-4 w-12" />
            <template v-else>{{ formatMoney(row.quote?.price, resolveHoldingCurrency(row)) }}</template>
          </TableCell>
          <TableCell class="text-right tabular-nums">
            {{ formatMoney(row.costPrice, resolveHoldingCurrency(row)) }}
          </TableCell>
          <TableCell class="text-right tabular-nums">
            {{ formatShares(row.shareCount) }}
          </TableCell>
          <TableCell class="text-right tabular-nums">
            {{ formatMoney(calculateHoldingMetrics(row).marketValue, resolveHoldingCurrency(row)) }}
          </TableCell>
          <TableCell class="text-right tabular-nums" :class="changeColorClass(calculateHoldingMetrics(row).unrealizedPnl)">
            {{ formatSignedMoney(calculateHoldingMetrics(row).unrealizedPnl, resolveHoldingCurrency(row)) }}
          </TableCell>
          <TableCell class="text-right tabular-nums" :class="changeColorClass(calculateHoldingMetrics(row).unrealizedPnlPercent)">
            {{ formatPercent(calculateHoldingMetrics(row).unrealizedPnlPercent) }}
          </TableCell>
          <TableCell class="text-right tabular-nums">
            {{ formatMoney(row.quote?.navPrice, resolveHoldingCurrency(row)) }}
          </TableCell>
          <TableCell class="text-right tabular-nums" :class="changeColorClass(row.quote?.premiumDiscountPercent)">
            {{ formatPercent(row.quote?.premiumDiscountPercent) }}
          </TableCell>
          <TableCell class="text-right tabular-nums" :class="changeColorClass(row.quote?.change)">
            {{ formatChange(row.quote?.change) }}
          </TableCell>
          <TableCell class="text-right tabular-nums" :class="changeColorClass(row.quote?.changePercent)">
            {{ formatPercent(row.quote?.changePercent) }}
          </TableCell>
          <TableCell class="text-right tabular-nums" :class="changeColorClass(row.quote?.ytdChangePercent)">
            {{ formatPercent(row.quote?.ytdChangePercent) }}
          </TableCell>
          <TableCell class="text-right tabular-nums">
            {{ formatCompact(row.quote?.volume) }}
          </TableCell>
          <TableCell class="text-right tabular-nums">
            {{ turnover(row.quote?.turnoverRate) }}
          </TableCell>
          <TableCell class="text-right tabular-nums">
            {{ formatPe(row.quote?.trailingPe ?? row.quote?.forwardPe) }}
          </TableCell>
          <TableCell class="text-right tabular-nums">
            {{ formatCompact(row.quote?.marketCap) }}
          </TableCell>
          <TableCell>
            <div class="flex flex-wrap gap-1">
              <Badge v-for="tag in row.tags" :key="tag" variant="secondary">
                {{ tag }}
              </Badge>
              <span v-if="row.tags.length === 0" class="text-muted-foreground">{{ DASH }}</span>
            </div>
          </TableCell>
          <TableCell class="text-right text-xs text-muted-foreground">
            {{ formatDateTime(row.quote?.fetchedAt) }}
          </TableCell>
          <TableCell @click.stop>
            <Button
              variant="ghost"
              size="icon"
              class="size-7 text-muted-foreground hover:text-destructive"
              aria-label="删除"
              @click="emit('remove', row.id)"
            >
              <Trash2Icon class="size-4" />
            </Button>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>
