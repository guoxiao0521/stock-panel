<script setup lang="ts">
import AppHeader from '@/components/AppHeader.vue'
import { Toaster } from '@/components/ui/sonner'

const { updatedAt, refreshing, triggerRefresh } = useAppHeader()
</script>

<template>
  <div class="flex min-h-screen flex-col bg-background text-foreground">
    <AppHeader
      :updated-at="updatedAt"
      :refreshing="refreshing"
      @refresh="triggerRefresh"
    />
    <main class="flex-1">
      <slot />
    </main>
    <Toaster position="top-right" rich-colors />
  </div>
</template>
