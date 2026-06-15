<script setup lang="ts">
import type { Candle } from '#shared/types'
import type { CandlestickData, IChartApi, ISeriesApi, LineData, Time } from 'lightweight-charts'
import { onBeforeUnmount, onMounted, reactive, shallowRef, useTemplateRef, watch } from 'vue'
import { computeSMA } from '@/lib/indicators'

// lightweight-charts 依赖 DOM/canvas，只能在客户端创建（onMounted）。
const props = defineProps<{
  candles: Candle[]
}>()

// 均线配置（基于收盘价的 SMA）。颜色与涨绿跌红的 K 线区分开。
const MA_CONFIGS = [
  { period: 5, color: '#f59e0b', label: 'MA5' },
  { period: 10, color: '#3b82f6', label: 'MA10' },
  { period: 20, color: '#a855f7', label: 'MA20' },
] as const

const container = useTemplateRef<HTMLDivElement>('container')
const chart = shallowRef<IChartApi | null>(null)
const candleSeries = shallowRef<ISeriesApi<'Candlestick'> | null>(null)
const maSeries = new Map<number, ISeriesApi<'Line'>>()
let stopThemeObserver: (() => void) | null = null

// 图例可见性（点击切换显示/隐藏对应均线）
const visible = reactive<Record<number, boolean>>(
  Object.fromEntries(MA_CONFIGS.map(m => [m.period, true])),
)

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
    timeScale: { borderColor: border },
  }
}

function toCandleData(candles: Candle[]): CandlestickData<Time>[] {
  return candles.map(c => ({
    time: c.time as Time,
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
  }))
}

function toLineData(candles: Candle[], period: number): LineData<Time>[] {
  return computeSMA(candles, period).map(p => ({ time: p.time as Time, value: p.value }))
}

function applyData(candles: Candle[]) {
  candleSeries.value?.setData(toCandleData(candles))
  for (const cfg of MA_CONFIGS)
    maSeries.get(cfg.period)?.setData(toLineData(candles, cfg.period))
  chart.value?.timeScale().fitContent()
}

function toggleMa(period: number) {
  visible[period] = !visible[period]
  maSeries.get(period)?.applyOptions({ visible: visible[period] })
}

function applyTheme() {
  chart.value?.applyOptions(themeOptions(isDark()))
}

onMounted(async () => {
  if (!container.value)
    return
  const { createChart, CandlestickSeries, LineSeries } = await import('lightweight-charts')
  const c = createChart(container.value, {
    autoSize: true,
    ...themeOptions(isDark()),
  })
  const s = c.addSeries(CandlestickSeries, {
    upColor: '#16a34a',
    downColor: '#dc2626',
    wickUpColor: '#16a34a',
    wickDownColor: '#dc2626',
    borderVisible: false,
  })
  for (const cfg of MA_CONFIGS) {
    const line = c.addSeries(LineSeries, {
      color: cfg.color,
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
      visible: visible[cfg.period],
    })
    maSeries.set(cfg.period, line)
  }
  chart.value = c
  candleSeries.value = s
  applyData(props.candles)

  const themeObserver = new MutationObserver(applyTheme)
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  })
  stopThemeObserver = () => themeObserver.disconnect()
})

watch(() => props.candles, candles => applyData(candles))

onBeforeUnmount(() => {
  stopThemeObserver?.()
  stopThemeObserver = null
  chart.value?.remove()
  chart.value = null
  candleSeries.value = null
  maSeries.clear()
})
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center gap-2 px-2 pt-2">
      <button
        v-for="cfg in MA_CONFIGS"
        :key="cfg.period"
        type="button"
        class="flex items-center gap-1 text-xs transition-opacity"
        :class="visible[cfg.period] ? 'opacity-100' : 'opacity-40'"
        @click="toggleMa(cfg.period)"
      >
        <span class="inline-block h-0.5 w-3 rounded" :style="{ backgroundColor: cfg.color }" />
        {{ cfg.label }}
      </button>
    </div>
    <div ref="container" class="h-64 w-full" />
  </div>
</template>
