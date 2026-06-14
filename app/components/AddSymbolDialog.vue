<script setup lang="ts">
import { PlusIcon } from '@lucide/vue'
import { ref } from 'vue'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const props = defineProps<{
  exists?: (symbol: string) => boolean
}>()

const emit = defineEmits<{
  add: [symbol: string]
}>()

const open = ref(false)
const symbol = ref('')
const error = ref('')

function submit() {
  const value = symbol.value.trim().toUpperCase()
  if (!value) {
    error.value = '请输入股票代码'
    return
  }
  if (!/^[A-Z.\-]{1,10}$/.test(value)) {
    error.value = '代码格式不正确，仅支持字母、点和连字符'
    return
  }
  if (props.exists?.(value)) {
    error.value = `${value} 已在自选股列表中`
    return
  }
  // TODO(Milestone 2): 调用 /api/watchlist/items，由 yahoo-finance2 校验是否为有效美股
  emit('add', value)
  symbol.value = ''
  error.value = ''
  open.value = false
}

function onOpenChange(value: boolean) {
  open.value = value
  if (!value) {
    symbol.value = ''
    error.value = ''
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="onOpenChange">
    <DialogTrigger as-child>
      <Button size="sm">
        <PlusIcon class="size-4" />
        添加股票
      </Button>
    </DialogTrigger>
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>添加自选股</DialogTitle>
        <DialogDescription>
          输入美股 ticker，例如 AAPL、MSFT、NVDA。
        </DialogDescription>
      </DialogHeader>
      <div class="space-y-2">
        <Label for="symbol-input">股票代码</Label>
        <Input
          id="symbol-input"
          v-model="symbol"
          placeholder="AAPL"
          autocomplete="off"
          class="uppercase"
          @keydown.enter="submit"
          @input="error = ''"
        />
        <p v-if="error" class="text-sm text-destructive">
          {{ error }}
        </p>
      </div>
      <DialogFooter>
        <Button variant="outline" @click="onOpenChange(false)">
          取消
        </Button>
        <Button @click="submit">
          添加
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
