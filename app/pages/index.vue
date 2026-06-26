<script setup lang="ts">
import type { WatchlistRow } from '#shared/types'
import { useIntervalFn, useStorage } from '@vueuse/core'
import { AlertTriangleIcon, ListPlusIcon } from '@lucide/vue'
import { onMounted, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import StockDetailSheet from '@/components/StockDetailSheet.vue'
import WatchlistTable from '@/components/WatchlistTable.vue'
import WatchlistToolbar from '@/components/WatchlistToolbar.vue'

const {
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
  updateNote,
  updateTags,
  refresh,
} = useWatchlist()

const { updatedAt, onRefresh } = useAppHeader()
const { loggedIn } = useAuthState()

const selected = ref<WatchlistRow | null>(null)
const detailOpen = ref(false)

// 自动刷新偏好持久化，间隔 5 分钟（PRD 7.1）
const AUTO_REFRESH_MS = 5 * 60 * 1000
const autoRefresh = useStorage('stock-panel-auto-refresh', false)

const { pause, resume } = useIntervalFn(
  async () => {
    await refresh(false)
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

async function onAdd(symbol: string) {
  if (!loggedIn.value) {
    toast.error('请先登录后再添加自选股')
    return
  }
  try {
    await add(symbol)
    toast.success(`已添加 ${symbol}`)
    updatedAt.value = new Date().toISOString()
  }
  catch (e) {
    toast.error(errMessage(e, `${symbol} 添加失败`))
  }
}

function onSelect(row: WatchlistRow) {
  selected.value = row
  detailOpen.value = true
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

async function onUpdateNote(id: string, note: string) {
  try {
    await updateNote(id, note)
  }
  catch (e) {
    toast.error(errMessage(e, '备注保存失败'))
  }
}

async function onUpdateTags(id: string, tags: string[]) {
  try {
    await updateTags(id, tags)
  }
  catch (e) {
    toast.error(errMessage(e, '标签保存失败'))
  }
}

// 登录态变化时重新加载列表（登录→个人列表，退出→默认列表）
watch(loggedIn, async () => {
  await load()
  await refresh(false)
  updatedAt.value = new Date().toISOString()
})

// 注册顶部刷新按钮的行为（手动刷新忽略缓存）
onRefresh(async () => {
  await refresh(true)
  updatedAt.value = new Date().toISOString()
  toast.success('行情已刷新')
})

onMounted(async () => {
  // 首屏优先展示 SQLite 缓存，再异步刷新过期行情（PRD 15）
  await load()
  updatedAt.value = new Date().toISOString()
  await refresh(false)
  updatedAt.value = new Date().toISOString()
})
</script>

<template>
  <div class="mx-auto max-w-screen-2xl space-y-4 px-4 py-6 lg:px-6">
    <div>
      <h1 class="text-xl font-semibold tracking-tight">自选股</h1>
      <p class="text-sm text-muted-foreground">
        管理你的美股关注列表，查看最新价、涨跌、估值与交易活跃度。
      </p>
    </div>

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
      @select="onSelect"
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

    <StockDetailSheet
      v-model:open="detailOpen"
      :row="selected"
      @update-note="onUpdateNote"
      @update-tags="onUpdateTags"
      @remove="onRemove"
    />
  </div>
</template>
