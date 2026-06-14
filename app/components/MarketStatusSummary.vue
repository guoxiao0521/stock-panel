<script setup lang="ts">
import type { MarketStatusSummary } from '@/lib/market-status'
import { Card, CardContent } from '@/components/ui/card'
import { statusToneClass } from '@/lib/market-status'

const props = defineProps<{
  summary: MarketStatusSummary
}>()

const items = computed(() => [
  props.summary.volatility,
  props.summary.riskAppetite,
  props.summary.breadth,
])
</script>

<template>
  <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
    <Card v-for="item in items" :key="item.label" class="gap-1 py-4">
      <CardContent class="px-4">
        <p class="text-xs text-muted-foreground">{{ item.label }}</p>
        <p class="text-lg font-semibold" :class="statusToneClass(item.tone)">
          {{ item.value }}
        </p>
        <p class="text-xs text-muted-foreground">{{ item.detail }}</p>
      </CardContent>
    </Card>
  </div>
</template>
