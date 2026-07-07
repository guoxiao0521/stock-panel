<script setup lang="ts">
import type { WatchlistRow } from '#shared/types'
import { HISTORY_RANGES } from '#shared/types'
import { ArrowLeftIcon, SparklesIcon, Trash2Icon, XIcon } from '@lucide/vue'
import { computed, onMounted, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import PriceChart from '@/components/PriceChart.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  changeColorClass,
  DASH,
  formatCompact,
  formatDateTime,
  formatMoney,
  formatPercent,
  formatPe,
  formatShares,
  formatSignedMoney,
} from '@/lib/format'
import { calculateHoldingMetrics, resolveHoldingCurrency } from '@/lib/holding'

const route = useRoute()
const symbol = computed(() => String(route.params.symbol ?? '').toUpperCase())

const {
  items,
  loading,
  load,
  refresh,
  updateNote,
  updateTags,
  updateHolding,
  remove,
} = useWatchlist()

const row = computed<WatchlistRow | null>(
  () => items.value.find(item => item.symbol === symbol.value) ?? null,
)

const initialLoadDone = ref(false)

onMounted(async () => {
  await load()
  initialLoadDone.value = true
  await refresh(false)
})

function errMessage(e: unknown, fallback: string): string {
  const err = e as { data?: { statusMessage?: string, message?: string }, statusMessage?: string }
  return err?.data?.statusMessage || err?.data?.message || err?.statusMessage || fallback
}

function goBack() {
  navigateTo('/')
}

function goToAnalysis() {
  if (row.value)
    navigateTo(`/analysis?symbol=${row.value.symbol}`)
}

// 备注 / 标签 / 持仓编辑缓冲区，切换股票时重置
const note = ref('')
const tagInput = ref('')
const tags = ref<string[]>([])
const costPriceInput = ref<string | number>('')
const shareCountInput = ref<string | number>('')
const holdingError = ref<string | null>(null)

watch(
  row,
  (r) => {
    note.value = r?.note ?? ''
    tags.value = r ? [...r.tags] : []
    costPriceInput.value = r?.costPrice == null ? '' : String(r.costPrice)
    shareCountInput.value = r?.shareCount == null ? '' : String(r.shareCount)
    holdingError.value = null
  },
  { immediate: true },
)

// 历史 K 线图
const range = ref<HistoryRange>('6M')
const { candles, loading: chartLoading, error: chartError } = useQuoteHistory(
  computed(() => row.value?.symbol ?? null),
  range,
)

async function saveNote() {
  if (!row.value)
    return
  try {
    await updateNote(row.value.id, note.value.trim())
  }
  catch (e) {
    toast.error(errMessage(e, '备注保存失败'))
  }
}

async function addTag() {
  if (!row.value)
    return
  const value = tagInput.value.trim()
  if (!value || tags.value.includes(value))
    return
  tags.value.push(value)
  tagInput.value = ''
  try {
    await updateTags(row.value.id, [...tags.value])
  }
  catch (e) {
    toast.error(errMessage(e, '标签保存失败'))
  }
}

async function removeTag(tag: string) {
  if (!row.value)
    return
  tags.value = tags.value.filter(t => t !== tag)
  try {
    await updateTags(row.value.id, [...tags.value])
  }
  catch (e) {
    toast.error(errMessage(e, '标签保存失败'))
  }
}

function parsePositiveInput(value: string | number, label: string): number | null {
  const trimmed = String(value).trim()
  if (!trimmed)
    return null
  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    holdingError.value = `${label}必须为大于 0 的数字`
    return null
  }
  return parsed
}

async function saveHolding() {
  if (!row.value)
    return

  holdingError.value = null
  const costPrice = parsePositiveInput(costPriceInput.value, '成本价')
  if (holdingError.value)
    return
  const shareCount = parsePositiveInput(shareCountInput.value, '持股数')
  if (holdingError.value)
    return

  try {
    await updateHolding(row.value.id, costPrice, shareCount)
    toast.success('持仓已保存')
  }
  catch (e) {
    toast.error(errMessage(e, '持仓保存失败'))
  }
}

async function handleRemove() {
  if (!row.value)
    return
  try {
    await remove(row.value.id)
    toast.success('已移除')
    await navigateTo('/')
  }
  catch (e) {
    toast.error(errMessage(e, '移除失败'))
  }
}

const metrics = computed(() => {
  const q = row.value?.quote
  const currency = resolveHoldingCurrency(row.value)
  return [
    { label: '最新价', value: formatMoney(q?.price, currency) },
    { label: '净值', value: formatMoney(q?.navPrice, currency) },
    { label: '折溢价', value: formatPercent(q?.premiumDiscountPercent), tone: q?.premiumDiscountPercent },
    { label: '日涨跌幅', value: formatPercent(q?.changePercent), tone: q?.changePercent },
    { label: '年初至今', value: formatPercent(q?.ytdChangePercent), tone: q?.ytdChangePercent },
    { label: '市值', value: formatCompact(q?.marketCap) },
    { label: '市盈率', value: formatPe(q?.trailingPe ?? q?.forwardPe) },
    { label: '成交量', value: formatCompact(q?.volume) },
  ]
})

const holdingMetrics = computed(() => calculateHoldingMetrics(row.value))

const holdingSummary = computed(() => {
  const currency = resolveHoldingCurrency(row.value)
  return [
    { label: '持仓市值', value: formatMoney(holdingMetrics.value.marketValue, currency) },
    {
      label: '浮动盈亏',
      value: formatSignedMoney(holdingMetrics.value.unrealizedPnl, currency),
      tone: holdingMetrics.value.unrealizedPnl,
    },
    {
      label: '盈亏率',
      value: formatPercent(holdingMetrics.value.unrealizedPnlPercent),
      tone: holdingMetrics.value.unrealizedPnlPercent,
    },
  ]
})
</script>

<template>
  <div class="mx-auto max-w-screen-2xl space-y-4 px-4 py-6 lg:px-6">
    <Button variant="ghost" size="sm" class="-ml-2 text-muted-foreground" @click="goBack">
      <ArrowLeftIcon class="size-4" />
      返回自选股
    </Button>

    <div v-if="row" class="space-y-4">
      <div class="flex flex-wrap items-center gap-2">
        <h1 class="text-xl font-semibold tracking-tight">{{ row.symbol }}</h1>
        <Badge v-if="row.exchange" variant="outline">{{ row.exchange }}</Badge>
        <Badge v-if="row.currency" variant="outline">{{ row.currency }}</Badge>
        <span class="text-sm text-muted-foreground">{{ row.name ?? '暂无公司名称' }}</span>
      </div>

      <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <!-- 左：K 线 -->
        <div class="space-y-2 rounded-lg border bg-muted/20">
          <div class="flex items-center justify-between px-2 pt-2">
            <label class="text-sm font-medium">历史走势</label>
            <div class="flex gap-1">
              <Button
                v-for="r in HISTORY_RANGES"
                :key="r"
                :variant="range === r ? 'secondary' : 'ghost'"
                size="sm"
                class="h-7 px-2 text-xs"
                @click="range = r"
              >
                {{ r }}
              </Button>
            </div>
          </div>
          <div class="relative">
            <ClientOnly>
              <PriceChart v-if="candles.length > 0" :candles="candles" />
              <div
                v-else
                class="flex h-[28rem] items-center justify-center text-sm text-muted-foreground"
              >
                {{ chartLoading ? '加载中…' : chartError ?? '暂无历史数据' }}
              </div>
              <template #fallback>
                <div class="flex h-[28rem] items-center justify-center text-sm text-muted-foreground">
                  加载中…
                </div>
              </template>
            </ClientOnly>
            <div
              v-if="chartLoading && candles.length > 0"
              class="absolute right-2 top-2 text-xs text-muted-foreground"
            >
              更新中…
            </div>
          </div>
        </div>

        <!-- 右：数据 / 持仓 / 其他信息 -->
        <div class="space-y-5">
          <div class="grid grid-cols-2 gap-3">
            <div
              v-for="m in metrics"
              :key="m.label"
              class="rounded-lg border bg-muted/30 p-3"
            >
              <p class="text-xs text-muted-foreground">{{ m.label }}</p>
              <p class="mt-1 font-medium tabular-nums" :class="m.tone !== undefined ? changeColorClass(m.tone) : ''">
                {{ m.value }}
              </p>
            </div>
          </div>

          <Button variant="outline" class="w-full" @click="goToAnalysis">
            <SparklesIcon class="size-4" />
            AI 分析
          </Button>

          <Separator />

          <div class="space-y-3">
            <div class="flex items-center justify-between gap-3">
              <label class="text-sm font-medium">持仓</label>
              <Button size="sm" class="h-7 px-3 text-xs" @click="saveHolding">
                保存
              </Button>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <label class="space-y-1.5">
                <span class="text-xs text-muted-foreground">成本价</span>
                <Input
                  v-model="costPriceInput"
                  type="number"
                  inputmode="decimal"
                  min="0"
                  step="any"
                  placeholder="0.00"
                />
              </label>
              <label class="space-y-1.5">
                <span class="text-xs text-muted-foreground">持股数</span>
                <Input
                  v-model="shareCountInput"
                  type="number"
                  inputmode="decimal"
                  min="0"
                  step="any"
                  placeholder="0"
                />
              </label>
            </div>
            <p v-if="holdingError" class="text-xs text-destructive">
              {{ holdingError }}
            </p>
            <div class="grid grid-cols-3 gap-2">
              <div
                v-for="m in holdingSummary"
                :key="m.label"
                class="rounded-lg border bg-muted/30 p-2.5"
              >
                <p class="text-xs text-muted-foreground">{{ m.label }}</p>
                <p class="mt-1 text-sm font-medium tabular-nums" :class="m.tone !== undefined ? changeColorClass(m.tone) : ''">
                  {{ m.value }}
                </p>
              </div>
            </div>
            <p class="text-xs text-muted-foreground">
              成本 {{ formatMoney(row.costPrice, resolveHoldingCurrency(row)) }} / 持股 {{ formatShares(row.shareCount) }}
            </p>
          </div>

          <Separator />

          <div class="space-y-2">
            <label class="text-sm font-medium">备注</label>
            <textarea
              v-model="note"
              rows="3"
              placeholder="添加备注…"
              class="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              @blur="saveNote"
            />
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium">标签</label>
            <div class="flex flex-wrap gap-1.5">
              <Badge v-for="tag in tags" :key="tag" variant="secondary" class="gap-1">
                {{ tag }}
                <button type="button" class="hover:text-destructive" @click="removeTag(tag)">
                  <XIcon class="size-3" />
                </button>
              </Badge>
              <span v-if="tags.length === 0" class="text-sm text-muted-foreground">暂无标签</span>
            </div>
            <Input
              v-model="tagInput"
              placeholder="输入标签后回车添加"
              @keydown.enter.prevent="addTag"
            />
          </div>

          <Separator />

          <div class="flex items-center justify-between text-xs text-muted-foreground">
            <span>数据源：Yahoo Finance</span>
            <span>更新于 {{ formatDateTime(row.quote?.fetchedAt) }}</span>
          </div>

          <Button
            variant="outline"
            class="w-full text-destructive hover:text-destructive"
            @click="handleRemove"
          >
            <Trash2Icon class="size-4" />
            从自选股移除
          </Button>
        </div>
      </div>
    </div>

    <div
      v-else-if="initialLoadDone && !loading"
      class="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-20 text-center"
    >
      <p class="font-medium">{{ symbol || DASH }} 不在自选股中</p>
      <p class="text-sm text-muted-foreground">该股票可能已被移除，或尚未添加到自选股。</p>
      <Button variant="outline" size="sm" @click="goBack">
        返回自选股
      </Button>
    </div>

    <div v-else class="flex items-center justify-center py-20 text-sm text-muted-foreground">
      加载中…
    </div>
  </div>
</template>
