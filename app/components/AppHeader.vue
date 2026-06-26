<script setup lang="ts">
import { LogOutIcon, MoonIcon, RefreshCwIcon, SunIcon, TrendingUpIcon } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
const { loggedIn, user, signInWithGoogle, signOut } = useAuthState()

async function loginWithGoogle() {
  await signInWithGoogle()
}

async function logout() {
  await signOut()
}
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

        <!-- 用户菜单（已登录） -->
        <DropdownMenu v-if="loggedIn && user">
          <DropdownMenuTrigger as-child>
            <Button variant="ghost" size="icon" class="rounded-full" aria-label="用户菜单">
              <img
                v-if="user.avatarUrl"
                :src="user.avatarUrl"
                :alt="user.name"
                class="size-7 rounded-full object-cover"
                referrerpolicy="no-referrer"
              />
              <span
                v-else
                class="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
              >
                {{ user.name.charAt(0).toUpperCase() }}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" class="w-52">
            <DropdownMenuLabel class="flex flex-col gap-0.5 py-2 font-normal">
              <span class="font-medium leading-tight">{{ user.name }}</span>
              <span class="text-xs text-muted-foreground">{{ user.email }}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem class="cursor-pointer" @click="logout">
              <LogOutIcon class="mr-2 size-4" />
              退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <!-- 登录按钮（未登录） -->
        <Button v-else variant="outline" size="sm" @click="loginWithGoogle">
          使用 Google 登录
        </Button>
      </div>
    </div>
  </header>
</template>
