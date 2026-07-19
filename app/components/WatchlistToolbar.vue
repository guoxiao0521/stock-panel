<script setup lang="ts">
import type { SortDirection, SortKey, WatchlistRow } from '#shared/types'
import { ArrowDownIcon, ArrowUpIcon, CopyIcon, SearchIcon, TimerIcon } from '@lucide/vue'
import { computed } from 'vue'
import AddSymbolDialog from '@/components/AddSymbolDialog.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SORT_OPTIONS } from '#shared/types'
import { useJsonClipboard } from '@/composables/useJsonClipboard'
import { isHeld, serializeHoldingsExport } from '@/lib/stock-json'

const props = defineProps<{
  count: number
  rows: WatchlistRow[]
  exists?: (symbol: string) => boolean
}>()

const emit = defineEmits<{
  add: [symbol: string, controls: AddSymbolDialogControls]
}>()

interface AddSymbolDialogControls {
  resolve: () => void
  reject: (message: string) => void
}

const search = defineModel<string>('search', { default: '' })
const sortKey = defineModel<SortKey>('sortKey', { default: 'manual' })
const sortDirection = defineModel<SortDirection>('sortDirection', { default: 'desc' })
const autoRefresh = defineModel<boolean>('autoRefresh', { default: false })

const { copyJson } = useJsonClipboard()
const heldCount = computed(() => props.rows.filter(isHeld).length)

function toggleDirection() {
  sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
}

function forwardAdd(symbol: string, controls: AddSymbolDialogControls) {
  emit('add', symbol, controls)
}

function copyHoldings() {
  copyJson(serializeHoldingsExport(props.rows), `已复制 ${heldCount.value} 只持仓`)
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-3">
    <div class="relative min-w-48 flex-1">
      <SearchIcon class="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        v-model="search"
        placeholder="搜索代码、名称或标签"
        class="pl-8"
      />
    </div>

    <div class="flex items-center gap-1">
      <Select v-model="sortKey">
        <SelectTrigger class="w-36">
          <SelectValue placeholder="排序方式" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem
            v-for="option in SORT_OPTIONS"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </SelectItem>
        </SelectContent>
      </Select>
      <Button
        variant="outline"
        size="icon"
        :disabled="sortKey === 'manual'"
        :aria-label="sortDirection === 'asc' ? '升序' : '降序'"
        @click="toggleDirection"
      >
        <ArrowUpIcon v-if="sortDirection === 'asc'" class="size-4" />
        <ArrowDownIcon v-else class="size-4" />
      </Button>
    </div>

    <Button
      :variant="autoRefresh ? 'default' : 'outline'"
      size="sm"
      :title="autoRefresh ? '自动刷新已开启（每 5 分钟）' : '开启自动刷新（每 5 分钟）'"
      @click="autoRefresh = !autoRefresh"
    >
      <TimerIcon class="size-4" />
      <span class="hidden sm:inline">自动刷新</span>
    </Button>

    <span class="text-sm text-muted-foreground">
      共 {{ count }} 只
    </span>

    <Button
      variant="outline"
      size="sm"
      :disabled="heldCount === 0"
      title="复制当前持仓数据为 JSON"
      @click="copyHoldings"
    >
      <CopyIcon class="size-4" />
      <span class="hidden sm:inline">复制持仓</span>
    </Button>

    <div class="ml-auto">
      <AddSymbolDialog :exists="exists" @add="forwardAdd" />
    </div>
  </div>
</template>
