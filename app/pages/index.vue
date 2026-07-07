<script setup lang="ts">
import { useIntervalFn, useStorage } from '@vueuse/core'
import { AlertTriangleIcon, ListPlusIcon } from '@lucide/vue'
import { onMounted, watch } from 'vue'
import { toast } from 'vue-sonner'
import MacroMarketSection from '@/components/MacroMarketSection.vue'
import PortfolioSummaryCards from '@/components/PortfolioSummaryCards.vue'
import WatchlistTable from '@/components/WatchlistTable.vue'
import WatchlistToolbar from '@/components/WatchlistToolbar.vue'
import { calculatePortfolioHoldingSummary } from '@/lib/holding'

const {
  items,
  filtered,
  search,
  sortKey,
  sortDirection,
  loading,
  error,
  hasSymbol,
  load,
  add,
  remove,
  refresh,
} = useWatchlist()

const {
  metrics,
  summary,
  error: marketError,
  load: loadMarket,
  refresh: refreshMarket,
} = useMarket()

const { series: indexSeries, load: loadIndices, start: startIndices } = useIntradayIndices()

const { updatedAt, onRefresh } = useAppHeader()
const { loggedIn } = useAuthState()

const portfolioSummary = computed(() => calculatePortfolioHoldingSummary(items.value))

interface AddSymbolDialogControls {
  resolve: () => void
  reject: (message: string) => void
}

// 自动刷新偏好持久化，间隔 5 分钟（PRD 7.1）
const AUTO_REFRESH_MS = 5 * 60 * 1000
const autoRefresh = useStorage('stock-panel-auto-refresh', false)

const { pause, resume } = useIntervalFn(
  async () => {
    await Promise.all([refresh(false), refreshMarket(false)])
    updatedAt.value = new Date().toISOString()
  },
  AUTO_REFRESH_MS,
  { immediate: false },
)

watch(autoRefresh, (on) => {
  if (on)
    resume()
  else
    pause()
}, { immediate: true })

function errMessage(e: unknown, fallback: string): string {
  const err = e as { data?: { statusMessage?: string, message?: string }, statusMessage?: string }
  return err?.data?.statusMessage || err?.data?.message || err?.statusMessage || fallback
}

async function onAdd(symbol: string, controls?: AddSymbolDialogControls) {
  if (!loggedIn.value) {
    const message = '请先登录后再添加自选股'
    controls?.reject(message)
    toast.error(message)
    return
  }
  try {
    await add(symbol)
    controls?.resolve()
    toast.success(`已添加 ${symbol}`)
    updatedAt.value = new Date().toISOString()
  }
  catch (e) {
    const message = errMessage(e, `${symbol} 添加失败`)
    controls?.reject(message)
    toast.error(message)
  }
}

async function onRemove(id: string) {
  try {
    await remove(id)
    toast.success('已移除')
  }
  catch (e) {
    toast.error(errMessage(e, '移除失败'))
  }
}

// 登录态变化时强制重新加载列表（登录→个人列表，退出→默认列表）
watch(loggedIn, async () => {
  await load(true)
  await refresh(false)
  updatedAt.value = new Date().toISOString()
})

// 注册顶部刷新按钮（手动刷新：自选股行情 + 宏观指标 + 指数走势同时刷新）
onRefresh(async () => {
  const [, marketResult] = await Promise.all([refresh(true), refreshMarket(true), loadIndices()])
  updatedAt.value = new Date().toISOString()
  if (!marketResult.ok)
    toast.error('刷新宏观指标失败')
  else if (marketResult.failed.length > 0)
    toast.warning(`部分指标刷新失败：${marketResult.failed.join('、')}，已保留旧数据`)
  else
    toast.success('行情已刷新')
})

onMounted(async () => {
  // 主要指数当日走势：首屏拉取并启动盘中自动轮询
  startIndices()
  // 首屏优先展示缓存，再异步刷新过期行情（PRD 15）
  await Promise.all([load(), loadMarket()])
  updatedAt.value = new Date().toISOString()
  const [, marketResult] = await Promise.all([refresh(false), refreshMarket(false)])
  updatedAt.value = new Date().toISOString()
  if (marketResult.ok && marketResult.failed.length > 0)
    toast.warning(`部分指标刷新失败：${marketResult.failed.join('、')}，已保留旧数据`)
})
</script>

<template>
  <div class="mx-auto max-w-screen-2xl space-y-4 px-4 py-6 lg:px-6">
    <!-- 宏观市场概览（可折叠） -->
    <MacroMarketSection
      :metrics="metrics"
      :summary="summary"
      :index-series="indexSeries"
      :error="marketError"
    />

    <div>
      <h1 class="text-xl font-semibold tracking-tight">自选股</h1>
      <p class="text-sm text-muted-foreground">
        管理你的美股关注列表，查看最新价、涨跌、估值与交易活跃度。
      </p>
    </div>

    <PortfolioSummaryCards :summary="portfolioSummary" />

    <WatchlistToolbar
      v-model:search="search"
      v-model:sort-key="sortKey"
      v-model:sort-direction="sortDirection"
      v-model:auto-refresh="autoRefresh"
      :count="filtered.length"
      :exists="hasSymbol"
      @add="onAdd"
    />

    <div
      v-if="error"
      class="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
    >
      <AlertTriangleIcon class="size-4 shrink-0" />
      <span>{{ error }}，已保留现有数据。</span>
    </div>

    <WatchlistTable
      v-if="filtered.length > 0"
      :rows="filtered"
      :loading="loading"
      @remove="onRemove"
    />

    <div
      v-else
      class="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-20 text-center"
    >
      <ListPlusIcon class="size-10 text-muted-foreground" />
      <div>
        <p class="font-medium">{{ search ? '没有匹配的股票' : '还没有自选股' }}</p>
        <p class="text-sm text-muted-foreground">
          {{ search ? '试试调整搜索条件' : '点击右上角“添加股票”输入美股 ticker 开始。' }}
        </p>
      </div>
    </div>
  </div>
</template>
