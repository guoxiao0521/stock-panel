<script setup lang="ts">
import type { CurrencyPortfolioSummary, PortfolioHoldingSummary } from '@/lib/holding'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { changeColorClass, formatCurrencyCode, formatMoney, formatPercent, formatSignedMoney } from '@/lib/format'

const props = defineProps<{
  summary: PortfolioHoldingSummary
}>()

function buildCards(section: CurrencyPortfolioSummary) {
  return [
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
  ]
}

function detailText(section: CurrencyPortfolioSummary): string {
  const { marketValueCount, pnlCount, incompleteCount } = section
  if (marketValueCount === 0 && pnlCount === 0)
    return '暂无完整持仓数据，可在个股详情页填写成本价与持股数。'

  const parts: string[] = []
  if (marketValueCount > 0)
    parts.push(`${marketValueCount} 只计入总市值`)
  if (pnlCount > 0)
    parts.push(`${pnlCount} 只计入总盈亏`)
  if (incompleteCount > 0)
    parts.push(`${incompleteCount} 只数据不完整已跳过`)

  return parts.join('，')
}

const hasAnyData = computed(() => props.summary.byCurrency.length > 0)
</script>

<template>
  <div class="space-y-4">
    <p
      v-if="summary.isMultiCurrency"
      class="text-xs text-muted-foreground"
    >
      持仓包含多种货币，以下按币种分别汇总，未做汇率换算。
    </p>

    <div
      v-if="hasAnyData"
      class="space-y-4"
    >
      <section
        v-for="section in summary.byCurrency"
        :key="section.currency"
        class="space-y-2"
      >
        <div
          v-if="summary.isMultiCurrency"
          class="flex items-center gap-2"
        >
          <Badge variant="outline">{{ section.currency }}</Badge>
        </div>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
      暂无完整持仓数据，可在个股详情页填写成本价与持股数。
    </div>
  </div>
</template>
