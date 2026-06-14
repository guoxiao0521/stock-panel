<script setup lang="ts">
import { computed } from 'vue'

// 纯 SVG 迷你走势图，无第三方依赖。按首尾值方向着色（涨绿跌红）。
const props = withDefaults(defineProps<{
  points: number[] | null | undefined
  width?: number
  height?: number
}>(), {
  width: 96,
  height: 28,
})

const PAD = 2

const tone = computed(() => {
  const p = props.points
  if (!p || p.length < 2)
    return 'neutral'
  const diff = p[p.length - 1]! - p[0]!
  if (diff > 0)
    return 'up'
  if (diff < 0)
    return 'down'
  return 'neutral'
})

const strokeClass = computed(() => {
  if (tone.value === 'up')
    return 'stroke-emerald-600 dark:stroke-emerald-500'
  if (tone.value === 'down')
    return 'stroke-rose-600 dark:stroke-rose-500'
  return 'stroke-muted-foreground'
})

const path = computed(() => {
  const p = props.points
  if (!p || p.length < 2)
    return null
  const min = Math.min(...p)
  const max = Math.max(...p)
  const span = max - min || 1
  const innerW = props.width - PAD * 2
  const innerH = props.height - PAD * 2
  const step = innerW / (p.length - 1)
  return p
    .map((v, i) => {
      const x = PAD + i * step
      const y = PAD + innerH - ((v - min) / span) * innerH
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')
})
</script>

<template>
  <svg
    v-if="path"
    :width="width"
    :height="height"
    :viewBox="`0 0 ${width} ${height}`"
    class="overflow-visible"
    role="img"
    aria-label="近 5 日走势"
  >
    <polyline
      :points="path"
      fill="none"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      :class="strokeClass"
    />
  </svg>
  <span v-else class="text-xs text-muted-foreground">-</span>
</template>
