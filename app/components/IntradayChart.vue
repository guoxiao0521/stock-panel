<script setup lang="ts">
import type { IntradayPoint } from '#shared/types'
import type { BaselineData, IChartApi, ISeriesApi, Time } from 'lightweight-charts'
import { onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from 'vue'

// lightweight-charts 依赖 DOM/canvas，只能在客户端创建（onMounted）。
const props = defineProps<{
  points: IntradayPoint[]
  previousClose: number | null
  gmtOffset?: number | null
}>()

const container = useTemplateRef<HTMLDivElement>('container')
const chart = shallowRef<IChartApi | null>(null)
const series = shallowRef<ISeriesApi<'Baseline'> | null>(null)
let stopThemeObserver: (() => void) | null = null

function isDark(): boolean {
  return typeof document !== 'undefined'
    && document.documentElement.classList.contains('dark')
}

function themeOptions(dark: boolean) {
  const text = dark ? '#a1a1aa' : '#52525b'
  const grid = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'
  const border = dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'
  return {
    layout: { background: { color: 'transparent' }, textColor: text },
    grid: { vertLines: { color: grid }, horzLines: { color: grid } },
    rightPriceScale: { borderColor: border },
    timeScale: { borderColor: border, timeVisible: true, secondsVisible: false },
  }
}

/** UNIX 秒（UTC）按市场时区偏移后格式化为 HH:MM，使 X 轴显示市场本地时间 */
function formatLocalTime(time: Time): string {
  const offset = props.gmtOffset ?? 0
  const d = new Date((Number(time) + offset) * 1000)
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const mm = String(d.getUTCMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

function toBaselineData(points: IntradayPoint[]): BaselineData<Time>[] {
  return points.map(p => ({ time: p.time as Time, value: p.value }))
}

function baseValuePrice(): number {
  return props.previousClose ?? props.points[0]?.value ?? 0
}

function applyData() {
  series.value?.applyOptions({ baseValue: { type: 'price', price: baseValuePrice() } })
  series.value?.setData(toBaselineData(props.points))
  chart.value?.timeScale().fitContent()
}

function applyTheme() {
  chart.value?.applyOptions(themeOptions(isDark()))
}

onMounted(async () => {
  if (!container.value)
    return
  const { createChart, BaselineSeries } = await import('lightweight-charts')
  const c = createChart(container.value, {
    autoSize: true,
    localization: { timeFormatter: formatLocalTime },
    ...themeOptions(isDark()),
  })
  c.timeScale().applyOptions({ tickMarkFormatter: formatLocalTime })
  const s = c.addSeries(BaselineSeries, {
    baseValue: { type: 'price', price: baseValuePrice() },
    topLineColor: '#16a34a',
    topFillColor1: 'rgba(22,163,74,0.28)',
    topFillColor2: 'rgba(22,163,74,0.04)',
    bottomLineColor: '#dc2626',
    bottomFillColor1: 'rgba(220,38,38,0.04)',
    bottomFillColor2: 'rgba(220,38,38,0.28)',
    lineWidth: 2,
    priceLineVisible: false,
  })
  chart.value = c
  series.value = s
  applyData()

  const themeObserver = new MutationObserver(applyTheme)
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  })
  stopThemeObserver = () => themeObserver.disconnect()
})

watch(() => [props.points, props.previousClose], applyData)

onBeforeUnmount(() => {
  stopThemeObserver?.()
  stopThemeObserver = null
  chart.value?.remove()
  chart.value = null
  series.value = null
})
</script>

<template>
  <div ref="container" class="h-40 w-full" />
</template>
