<script setup lang="ts">
import type { TradeSide, TradeWithPnl } from '#shared/types'
import { LoaderCircleIcon, Trash2Icon } from '@lucide/vue'
import { computed, onMounted, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  formatDateTime,
  formatMoney,
  formatShares,
  formatSignedMoney,
} from '@/lib/format'

const props = defineProps<{
  symbol: string
  currency: string
  costPrice?: number | null
  shareCount?: number | null
}>()

const emit = defineEmits<{
  holdingChanged: []
}>()

const { trades, summary, loading, error, load, addTrade, removeTrade } = useTrades()

const side = ref<TradeSide>('buy')
const quantityInput = ref<string | number>('')
const priceInput = ref<string | number>('')
const feeInput = ref<string | number>('0')
const tradedAtInput = ref(todayLocalDate())
const submitting = ref(false)
const seeding = ref(false)
const removingTradeIds = ref(new Set<string>())
const formError = ref<string | null>(null)

const availableShares = computed(() => Math.max(0, summary.value?.shareCount ?? 0))
const sellUnavailable = computed(() =>
  side.value === 'sell'
  && (loading.value || summary.value == null || availableShares.value <= 1e-9),
)

const displayTrades = computed(() =>
  [...trades.value]
    .filter(t => t.symbol === props.symbol.toUpperCase())
    .sort((a, b) => b.tradedAt.localeCompare(a.tradedAt) || b.createdAt.localeCompare(a.createdAt)),
)

const canSeedOpeningBuy = computed(() =>
  displayTrades.value.length === 0
  && props.costPrice != null
  && props.costPrice > 0
  && props.shareCount != null
  && props.shareCount > 0,
)

function todayLocalDate(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function errMessage(e: unknown, fallback: string): string {
  const err = e as {
    data?: { statusMessage?: string, message?: string }
    statusMessage?: string
    message?: string
  }
  return err?.data?.statusMessage
    || err?.data?.message
    || err?.statusMessage
    || (typeof err?.message === 'string' && err.message !== 'FetchError' ? err.message : null)
    || fallback
}

function parseNonNegative(value: string | number, label: string, allowZero = true): number | null {
  const trimmed = String(value).trim()
  if (!trimmed) {
    formError.value = `${label}不能为空`
    return null
  }
  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed) || parsed < 0 || (!allowZero && parsed <= 0)) {
    formError.value = allowZero
      ? `${label}必须为大于等于 0 的数字`
      : `${label}必须为大于 0 的数字`
    return null
  }
  return parsed
}

async function reload() {
  await load(props.symbol, true)
}

onMounted(() => {
  void reload()
})

watch(
  () => props.symbol,
  () => {
    side.value = 'buy'
    quantityInput.value = ''
    priceInput.value = ''
    feeInput.value = '0'
    tradedAtInput.value = todayLocalDate()
    formError.value = null
    void reload()
  },
)

async function submitTrade() {
  formError.value = null
  const quantity = parseNonNegative(quantityInput.value, '数量', false)
  if (quantity == null)
    return
  if (side.value === 'sell') {
    if (loading.value || summary.value == null) {
      formError.value = '持仓尚未加载完成，请稍后重试'
      return
    }
    if (quantity - availableShares.value > 1e-9) {
      formError.value = `卖出数量不能超过可卖持仓 ${formatShares(availableShares.value)}`
      return
    }
  }
  const price = parseNonNegative(priceInput.value, '价格', true)
  if (price == null)
    return
  const fee = parseNonNegative(feeInput.value || '0', '手续费', true)
  if (fee == null)
    return

  submitting.value = true
  try {
    await addTrade({
      symbol: props.symbol,
      side: side.value,
      quantity,
      price,
      fee,
      tradedAt: tradedAtInput.value || undefined,
    })
    quantityInput.value = ''
    priceInput.value = ''
    feeInput.value = '0'
    toast.success(side.value === 'buy' ? '买入记录已添加' : '卖出记录已添加')
    emit('holdingChanged')
  }
  catch (e) {
    toast.error(errMessage(e, '添加交易失败'))
  }
  finally {
    submitting.value = false
  }
}

async function seedOpeningBuy() {
  if (!canSeedOpeningBuy.value || props.costPrice == null || props.shareCount == null)
    return

  seeding.value = true
  try {
    await addTrade({
      symbol: props.symbol,
      side: 'buy',
      quantity: props.shareCount,
      price: props.costPrice,
      fee: 0,
      tradedAt: tradedAtInput.value || undefined,
    })
    toast.success('已将当前持仓记为期初买入，现在可以记录卖出')
    emit('holdingChanged')
  }
  catch (e) {
    toast.error(errMessage(e, '补录买入失败'))
  }
  finally {
    seeding.value = false
  }
}

async function handleRemove(trade: TradeWithPnl) {
  if (removingTradeIds.value.has(trade.id))
    return

  removingTradeIds.value.add(trade.id)
  try {
    await removeTrade(trade.id)
    toast.success('交易记录已删除')
    emit('holdingChanged')
  }
  catch (e) {
    toast.error(errMessage(e, '删除交易失败'))
  }
  finally {
    removingTradeIds.value.delete(trade.id)
  }
}

function sideLabel(value: TradeSide): string {
  return value === 'buy' ? '买入' : '卖出'
}

function tradeAmount(trade: TradeWithPnl): number {
  return trade.price * trade.quantity
}
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between gap-3">
      <label class="text-sm font-medium">交易记录</label>
      <Badge v-if="summary" variant="outline" class="tabular-nums">
        已实现 {{ formatSignedMoney(summary.realizedPnl, currency) }}
      </Badge>
    </div>

    <div
      v-if="canSeedOpeningBuy"
      class="space-y-2 rounded-md border border-dashed bg-muted/30 px-3 py-2.5"
    >
      <p class="text-xs leading-5 text-muted-foreground">
        检测到手动持仓 {{ formatShares(shareCount) }} 股 / 成本
        {{ formatMoney(costPrice, currency) }}，但交易账本为空。卖出前请先补录买入。
      </p>
      <Button
        size="sm"
        variant="secondary"
        class="h-7 px-3 text-xs"
        :disabled="seeding"
        @click="seedOpeningBuy"
      >
        {{ seeding ? '补录中…' : '将当前持仓记为期初买入' }}
      </Button>
    </div>

    <div class="grid grid-cols-2 gap-2">
      <label class="space-y-1.5">
        <span class="text-xs text-muted-foreground">方向</span>
        <Select v-model="side">
          <SelectTrigger class="w-full">
            <SelectValue placeholder="选择方向" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="buy">买入</SelectItem>
            <SelectItem value="sell">卖出</SelectItem>
          </SelectContent>
        </Select>
      </label>
      <label class="space-y-1.5">
        <span class="text-xs text-muted-foreground">日期</span>
        <Input v-model="tradedAtInput" type="date" />
      </label>
      <label class="space-y-1.5">
        <span class="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>数量</span>
          <span v-if="side === 'sell'" class="tabular-nums">
            可卖 {{ formatShares(availableShares) }}
          </span>
        </span>
        <Input
          v-model="quantityInput"
          type="number"
          inputmode="decimal"
          min="0"
          :max="side === 'sell' ? availableShares : undefined"
          step="any"
          placeholder="0"
        />
      </label>
      <label class="space-y-1.5">
        <span class="text-xs text-muted-foreground">价格</span>
        <Input
          v-model="priceInput"
          type="number"
          inputmode="decimal"
          min="0"
          step="any"
          placeholder="0.00"
        />
      </label>
      <label class="col-span-2 space-y-1.5">
        <span class="text-xs text-muted-foreground">手续费</span>
        <Input
          v-model="feeInput"
          type="number"
          inputmode="decimal"
          min="0"
          step="any"
          placeholder="0"
        />
      </label>
    </div>

    <p v-if="formError" role="alert" class="text-xs text-destructive">
      {{ formError }}
    </p>

    <p
      v-else-if="side === 'sell' && !loading && availableShares <= 1e-9"
      class="text-xs text-muted-foreground"
    >
      当前没有可卖持仓，请先记录买入。
    </p>

    <Button
      class="w-full"
      size="sm"
      :disabled="submitting || sellUnavailable"
      @click="submitTrade"
    >
      {{ submitting
        ? '提交中…'
        : (side === 'buy'
          ? '记录买入'
          : (loading ? '加载持仓中…' : (sellUnavailable ? '暂无持仓可卖' : '记录卖出'))) }}
    </Button>

    <div
      v-if="summary"
      class="grid grid-cols-3 gap-2"
    >
      <div class="rounded-lg border bg-muted/30 p-2.5">
        <p class="text-xs text-muted-foreground">回放持仓</p>
        <p class="mt-1 text-sm font-medium tabular-nums">
          {{ formatShares(summary.shareCount) }}
        </p>
      </div>
      <div class="rounded-lg border bg-muted/30 p-2.5">
        <p class="text-xs text-muted-foreground">平均成本</p>
        <p class="mt-1 text-sm font-medium tabular-nums">
          {{ formatMoney(summary.avgCost, currency) }}
        </p>
      </div>
      <div class="rounded-lg border bg-muted/30 p-2.5">
        <p class="text-xs text-muted-foreground">已实现盈亏</p>
        <p
          class="mt-1 text-sm font-medium tabular-nums"
          :class="changeColorClass(summary.realizedPnl)"
        >
          {{ formatSignedMoney(summary.realizedPnl, currency) }}
        </p>
      </div>
    </div>

    <p v-if="error" class="text-xs text-destructive">
      {{ error }}
    </p>

    <div class="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>日期</TableHead>
            <TableHead>方向</TableHead>
            <TableHead class="text-right">数量</TableHead>
            <TableHead class="text-right">价格</TableHead>
            <TableHead class="text-right">手续费</TableHead>
            <TableHead class="text-right">金额</TableHead>
            <TableHead class="text-right">盈亏</TableHead>
            <TableHead class="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="loading && displayTrades.length === 0">
            <TableCell colspan="8" class="text-center text-muted-foreground">
              加载中…
            </TableCell>
          </TableRow>
          <TableRow v-else-if="displayTrades.length === 0">
            <TableCell colspan="8" class="text-center text-muted-foreground">
              暂无交易记录
            </TableCell>
          </TableRow>
          <TableRow
            v-for="trade in displayTrades"
            :key="trade.id"
          >
            <TableCell class="whitespace-nowrap text-xs">
              {{ formatDateTime(trade.tradedAt) }}
            </TableCell>
            <TableCell>
              <Badge :variant="trade.side === 'buy' ? 'secondary' : 'outline'">
                {{ sideLabel(trade.side) }}
              </Badge>
            </TableCell>
            <TableCell class="text-right tabular-nums">
              {{ formatShares(trade.quantity) }}
            </TableCell>
            <TableCell class="text-right tabular-nums">
              {{ formatMoney(trade.price, currency) }}
            </TableCell>
            <TableCell class="text-right tabular-nums">
              {{ formatMoney(trade.fee, currency) }}
            </TableCell>
            <TableCell class="text-right tabular-nums">
              {{ formatMoney(tradeAmount(trade), currency) }}
            </TableCell>
            <TableCell
              class="text-right tabular-nums"
              :class="trade.realizedPnl != null ? changeColorClass(trade.realizedPnl) : ''"
            >
              {{ trade.realizedPnl != null ? formatSignedMoney(trade.realizedPnl, currency) : DASH }}
            </TableCell>
            <TableCell>
              <Button
                variant="ghost"
                size="icon"
                class="size-7 text-muted-foreground hover:text-destructive"
                :disabled="removingTradeIds.has(trade.id)"
                :aria-label="removingTradeIds.has(trade.id) ? '正在删除交易记录' : '删除交易记录'"
                @click="handleRemove(trade)"
              >
                <LoaderCircleIcon
                  v-if="removingTradeIds.has(trade.id)"
                  class="size-3.5 animate-spin"
                />
                <Trash2Icon v-else class="size-3.5" />
              </Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <p class="text-xs text-muted-foreground">
      卖出盈亏按移动加权平均成本计算，买入手续费计入成本，卖出手续费从盈亏中扣除。录入或删除交易后会自动同步上方持仓。
    </p>
  </div>
</template>
