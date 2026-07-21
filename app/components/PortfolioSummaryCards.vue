<script setup lang="ts">
import type { PortfolioHoldingSummary } from '@/lib/holding'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { changeColorClass, formatCurrencyCode, formatMoney, formatPercent, formatSignedMoney } from '@/lib/format'

const props = defineProps<{
  summary: PortfolioHoldingSummary
  /** 按币种汇总的已实现盈亏（来自交易记录回放） */
  realizedPnlByCurrency?: Record<string, number>
}>()

interface DisplaySection {
  currency: string
  totalCostBasis: number | null
  totalMarketValue: number | null
  totalUnrealizedPnl: number | null
  totalUnrealizedPnlPercent: number | null
  totalRealizedPnl: number | null
  costBasisCount: number
  marketValueCount: number
  pnlCount: number
  incompleteCount: number
  hasHoldingData: boolean
}

const displaySections = computed<DisplaySection[]>(() => {
  const realized = props.realizedPnlByCurrency ?? {}
  const holdingMap = new Map(props.summary.byCurrency.map(section => [section.currency, section]))
  const currencies = new Set([
    ...props.summary.byCurrency.map(section => section.currency),
    ...Object.keys(realized),
  ])

  return [...currencies]
    .sort((a, b) => a.localeCompare(b))
    .map((currency) => {
      const section = holdingMap.get(currency)
      const hasRealized = Object.prototype.hasOwnProperty.call(realized, currency)
      return {
        currency,
        totalCostBasis: section?.totalCostBasis ?? null,
        totalMarketValue: section?.totalMarketValue ?? null,
        totalUnrealizedPnl: section?.totalUnrealizedPnl ?? null,
        totalUnrealizedPnlPercent: section?.totalUnrealizedPnlPercent ?? null,
        totalRealizedPnl: hasRealized ? realized[currency]! : null,
        costBasisCount: section?.costBasisCount ?? 0,
        marketValueCount: section?.marketValueCount ?? 0,
        pnlCount: section?.pnlCount ?? 0,
        incompleteCount: section?.incompleteCount ?? 0,
        hasHoldingData: Boolean(section),
      }
    })
})

const isMultiCurrency = computed(() => displaySections.value.length > 1)

function buildCards(section: DisplaySection) {
  return [
    {
      label: '持仓本金',
      value: formatMoney(section.totalCostBasis, section.currency),
      currencyCode: formatCurrencyCode(section.currency),
      tone: undefined as number | undefined,
    },
    {
      label: '总持仓市值',
      value: formatMoney(section.totalMarketValue, section.currency),
      currencyCode: formatCurrencyCode(section.currency),
      tone: undefined as number | undefined,
    },
    {
      label: '持仓总盈亏',
      value: formatSignedMoney(section.totalUnrealizedPnl, section.currency),
      currencyCode: formatCurrencyCode(section.currency),
      tone: section.totalUnrealizedPnl ?? undefined,
    },
    {
      label: '持仓盈亏率',
      value: formatPercent(section.totalUnrealizedPnlPercent),
      currencyCode: null,
      tone: section.totalUnrealizedPnlPercent ?? undefined,
    },
    {
      label: '已实现盈亏',
      value: formatSignedMoney(section.totalRealizedPnl, section.currency),
      currencyCode: formatCurrencyCode(section.currency),
      tone: section.totalRealizedPnl ?? undefined,
    },
  ]
}

function detailText(section: DisplaySection): string {
  const { costBasisCount, marketValueCount, pnlCount, incompleteCount, totalRealizedPnl, hasHoldingData } = section
  if (!hasHoldingData && totalRealizedPnl != null)
    return '当前无持仓，以下为历史卖出已实现盈亏。'

  if (costBasisCount === 0 && marketValueCount === 0 && pnlCount === 0 && totalRealizedPnl == null)
    return '暂无完整持仓数据，可在个股详情页填写成本价与持股数，或录入买卖交易。'

  const parts: string[] = []
  if (costBasisCount > 0)
    parts.push(`${costBasisCount} 只计入持仓本金`)
  if (marketValueCount > 0)
    parts.push(`${marketValueCount} 只计入总市值`)
  if (pnlCount > 0)
    parts.push(`${pnlCount} 只计入浮动盈亏`)
  if (totalRealizedPnl != null)
    parts.push('已实现盈亏来自交易记录')
  if (incompleteCount > 0)
    parts.push(`${incompleteCount} 只数据不完整已跳过`)

  return parts.join('，')
}

const hasAnyData = computed(() => displaySections.value.length > 0)
</script>

<template>
  <div class="space-y-4">
    <p
      v-if="isMultiCurrency"
      class="text-xs text-muted-foreground"
    >
      持仓包含多种货币，以下按币种分别汇总，未做汇率换算。
    </p>

    <div
      v-if="hasAnyData"
      class="space-y-4"
    >
      <section
        v-for="section in displaySections"
        :key="section.currency"
        class="space-y-2"
      >
        <div
          v-if="isMultiCurrency"
          class="flex items-center gap-2"
        >
          <Badge variant="outline">{{ section.currency }}</Badge>
        </div>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Card
            v-for="card in buildCards(section)"
            :key="`${section.currency}-${card.label}`"
            class="gap-1 py-4"
          >
            <CardContent class="px-4">
              <p class="text-xs text-muted-foreground">{{ card.label }}</p>
              <p
                class="flex items-baseline gap-1 text-lg font-semibold tabular-nums"
                :class="card.tone !== undefined ? changeColorClass(card.tone) : ''"
              >
                <span>{{ card.value }}</span>
                <span
                  v-if="card.currencyCode"
                  class="text-xs font-medium text-muted-foreground"
                >
                  ({{ card.currencyCode }})
                </span>
              </p>
            </CardContent>
          </Card>
        </div>

        <p class="text-xs text-muted-foreground">
          {{ detailText(section) }}
        </p>
      </section>
    </div>

    <div
      v-else
      class="rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground"
    >
      暂无完整持仓数据，可在个股详情页填写成本价与持股数，或录入买卖交易。
    </div>
  </div>
</template>
