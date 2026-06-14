<script setup lang="ts">
import { MoonIcon, RefreshCwIcon, SunIcon, TrendingUpIcon } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { formatDateTime } from '@/lib/format'

interface NavItem {
  to: string
  label: string
  phase?: string
}

const navItems: NavItem[] = [
  { to: '/', label: '自选股' },
  { to: '/market', label: '宏观市场', phase: 'P2' },
  { to: '/analysis', label: 'AI 分析', phase: 'P3' },
]

const props = defineProps<{
  updatedAt?: string | null
  refreshing?: boolean
}>()

const emit = defineEmits<{
  refresh: []
}>()

const { mode, toggle } = useTheme()
</script>

<template>
  <header class="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
    <div class="mx-auto flex h-14 max-w-screen-2xl items-center gap-4 px-4 lg:px-6">
      <NuxtLink to="/" class="flex items-center gap-2 font-semibold">
        <TrendingUpIcon class="size-5 text-primary" />
        <span class="tracking-tight">Stock Panel</span>
      </NuxtLink>

      <nav class="flex items-center gap-1">
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="group flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          active-class="bg-muted !text-foreground"
        >
          {{ item.label }}
          <span
            v-if="item.phase"
            class="rounded bg-muted-foreground/10 px-1 text-[10px] font-normal text-muted-foreground"
          >
            {{ item.phase }}
          </span>
        </NuxtLink>
      </nav>

      <div class="ml-auto flex items-center gap-3">
        <span class="hidden text-xs text-muted-foreground sm:inline">
          更新于 {{ formatDateTime(props.updatedAt) }}
        </span>

        <Button
          variant="outline"
          size="sm"
          :disabled="props.refreshing"
          @click="emit('refresh')"
        >
          <RefreshCwIcon class="size-4" :class="{ 'animate-spin': props.refreshing }" />
          <span class="hidden sm:inline">刷新</span>
        </Button>

        <Button variant="ghost" size="icon" aria-label="切换主题" @click="toggle">
          <SunIcon v-if="mode === 'dark'" class="size-4" />
          <MoonIcon v-else class="size-4" />
        </Button>
      </div>
    </div>
  </header>
</template>
