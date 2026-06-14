<script setup lang="ts">
import type { Candle, HistoryRange, WatchlistRow } from '#shared/types'
import { HISTORY_RANGES } from '#shared/types'
import { Trash2Icon, XIcon } from '@lucide/vue'
import { ref, watch } from 'vue'
import PriceChart from '@/components/PriceChart.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  changeColorClass,
  DASH,
  formatCompact,
  formatDateTime,
  formatPercent,
  formatPe,
  formatPrice,
} from '@/lib/format'

const props = defineProps<{
  row: WatchlistRow | null
}>()

const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  updateNote: [id: string, note: string]
  updateTags: [id: string, tags: string[]]
  remove: [id: string]
}>()

const note = ref('')
const tagInput = ref('')
const tags = ref<string[]>([])

watch(
  () => props.row,
  (row) => {
    note.value = row?.note ?? ''
    tags.value = row ? [...row.tags] : []
  },
  { immediate: true },
)

// 历史 K 线图
const range = ref<HistoryRange>('6M')
const candles = ref<Candle[]>([])
const chartLoading = ref(false)
const chartError = ref<string | null>(null)
let historyToken = 0

async function loadHistory() {
  const symbol = props.row?.symbol
  if (!symbol || !open.value)
    return
  const token = ++historyToken
  chartLoading.value = true
  chartError.value = null
  try {
    const data = await $fetch('/api/quotes/history', {
      query: { symbol, range: range.value },
    })
    // 丢弃过期请求（快速切换 symbol/区间时）
    if (token !== historyToken)
      return
    candles.value = data.candles as Candle[]
  }
  catch {
    if (token !== historyToken)
      return
    candles.value = []
    chartError.value = '历史数据加载失败'
  }
  finally {
    if (token === historyToken)
      chartLoading.value = false
  }
}

// 打开、切换股票或切换区间时加载
watch(
  [() => props.row?.symbol, range, open],
  () => {
    if (open.value && props.row)
      loadHistory()
  },
  { immediate: true },
)

function saveNote() {
  if (props.row)
    emit('updateNote', props.row.id, note.value.trim())
}

function addTag() {
  const value = tagInput.value.trim()
  if (!value || tags.value.includes(value))
    return
  tags.value.push(value)
  tagInput.value = ''
  if (props.row)
    emit('updateTags', props.row.id, [...tags.value])
}

function removeTag(tag: string) {
  tags.value = tags.value.filter(t => t !== tag)
  if (props.row)
    emit('updateTags', props.row.id, [...tags.value])
}

const metrics = computed(() => {
  const q = props.row?.quote
  return [
    { label: '最新价', value: formatPrice(q?.price) },
    { label: '日涨跌幅', value: formatPercent(q?.changePercent), tone: q?.changePercent },
    { label: '年初至今', value: formatPercent(q?.ytdChangePercent), tone: q?.ytdChangePercent },
    { label: '市值', value: formatCompact(q?.marketCap) },
    { label: '市盈率', value: formatPe(q?.trailingPe ?? q?.forwardPe) },
    { label: '成交量', value: formatCompact(q?.volume) },
  ]
})
</script>

<template>
  <Sheet v-model:open="open">
    <SheetContent side="right" class="w-full gap-0 overflow-y-auto sm:max-w-md">
      <SheetHeader>
        <SheetTitle class="flex items-center gap-2">
          <span>{{ row?.symbol ?? DASH }}</span>
          <Badge v-if="row?.exchange" variant="outline">{{ row.exchange }}</Badge>
          <Badge v-if="row?.currency" variant="outline">{{ row.currency }}</Badge>
        </SheetTitle>
        <SheetDescription>
          {{ row?.name ?? '暂无公司名称' }}
        </SheetDescription>
      </SheetHeader>

      <div v-if="row" class="space-y-5 px-4 pb-6">
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

        <Separator />

        <div class="space-y-2">
          <div class="flex items-center justify-between">
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
          <div class="relative rounded-lg border bg-muted/20">
            <ClientOnly>
              <PriceChart v-if="candles.length > 0" :candles="candles" />
              <div
                v-else
                class="flex h-64 items-center justify-center text-sm text-muted-foreground"
              >
                {{ chartLoading ? '加载中…' : chartError ?? '暂无历史数据' }}
              </div>
              <template #fallback>
                <div class="flex h-64 items-center justify-center text-sm text-muted-foreground">
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
          @click="emit('remove', row.id); open = false"
        >
          <Trash2Icon class="size-4" />
          从自选股移除
        </Button>
      </div>
    </SheetContent>
  </Sheet>
</template>
