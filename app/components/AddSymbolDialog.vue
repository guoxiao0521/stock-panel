<script setup lang="ts">
import { LoaderCircleIcon, PlusIcon } from '@lucide/vue'
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

interface AddSymbolDialogControls {
  resolve: () => void
  reject: (message: string) => void
}

const emit = defineEmits<{
  add: [symbol: string, controls: AddSymbolDialogControls]
}>()

const open = ref(false)
const symbol = ref('')
const error = ref('')
const submitting = ref(false)

function submit() {
  if (submitting.value)
    return

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

  submitting.value = true
  error.value = ''
  emit('add', value, {
    resolve: () => {
      submitting.value = false
      symbol.value = ''
      error.value = ''
      open.value = false
    },
    reject: (message: string) => {
      submitting.value = false
      error.value = message
    },
  })
}

function onOpenChange(value: boolean) {
  if (submitting.value)
    return

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
          :disabled="submitting"
          @keydown.enter="submit"
          @input="error = ''"
        />
        <p v-if="error" class="text-sm text-destructive">
          {{ error }}
        </p>
      </div>
      <DialogFooter>
        <Button variant="outline" :disabled="submitting" @click="onOpenChange(false)">
          取消
        </Button>
        <Button :disabled="submitting" @click="submit">
          <LoaderCircleIcon v-if="submitting" class="size-4 animate-spin" />
          {{ submitting ? '添加中' : '添加' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
