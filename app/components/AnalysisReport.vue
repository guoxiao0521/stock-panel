<script setup lang="ts">
import type { AnalysisReport } from '#shared/types'
import { AlertTriangleIcon, CheckIcon, MinusIcon, XIcon } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

defineProps<{
  report: AnalysisReport
}>()
</script>

<template>
  <div class="space-y-4">
    <Card>
      <CardHeader>
        <div class="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle>{{ report.title }}</CardTitle>
            <CardDescription class="mt-1">
              {{ report.symbol }} · {{ report.meta.skillSource }} · {{ report.meta.provider }}
            </CardDescription>
          </div>
          <Badge variant="outline" class="shrink-0">
            {{ new Date(report.createdAt).toLocaleString('zh-CN') }}
          </Badge>
        </div>
      </CardHeader>
      <CardContent class="space-y-3">
        <p class="text-sm leading-relaxed">
          {{ report.summary }}
        </p>
        <div v-if="report.riskFlags.length > 0" class="flex flex-wrap gap-2">
          <Badge
            v-for="flag in report.riskFlags"
            :key="flag"
            variant="destructive"
            class="font-normal"
          >
            <AlertTriangleIcon class="mr-1 size-3" />
            {{ flag }}
          </Badge>
        </div>
      </CardContent>
    </Card>

    <Card v-for="(section, idx) in report.sections" :key="idx">
      <CardHeader class="pb-2">
        <CardTitle class="text-base">{{ section.title }}</CardTitle>
        <CardDescription v-if="section.content" class="whitespace-pre-wrap">
          {{ section.content }}
        </CardDescription>
      </CardHeader>
      <CardContent v-if="section.kind !== 'text' || !section.content">
        <Table v-if="section.kind === 'metrics' && section.metrics?.length">
          <TableHeader>
            <TableRow>
              <TableHead>指标</TableHead>
              <TableHead class="text-right">数值</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="metric in section.metrics" :key="metric.label">
              <TableCell class="text-muted-foreground">{{ metric.label }}</TableCell>
              <TableCell class="text-right font-medium tabular-nums">
                {{ metric.value }}
                <span v-if="metric.detail" class="block text-xs font-normal text-muted-foreground">
                  {{ metric.detail }}
                </span>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>

        <ul v-else-if="section.kind === 'checklist' && section.checklist?.length" class="space-y-2">
          <li
            v-for="item in section.checklist"
            :key="item.label"
            class="flex items-start gap-2 text-sm"
          >
            <CheckIcon
              v-if="item.pass === true"
              class="mt-0.5 size-4 shrink-0 text-emerald-600"
            />
            <XIcon
              v-else-if="item.pass === false"
              class="mt-0.5 size-4 shrink-0 text-rose-600"
            />
            <MinusIcon
              v-else
              class="mt-0.5 size-4 shrink-0 text-muted-foreground"
            />
            <div>
              <span>{{ item.label }}</span>
              <span v-if="item.detail" class="block text-xs text-muted-foreground">{{ item.detail }}</span>
            </div>
          </li>
        </ul>

        <ul v-else-if="section.kind === 'list' && section.items?.length" class="list-inside list-disc space-y-1 text-sm text-muted-foreground">
          <li v-for="(item, i) in section.items" :key="i">{{ item }}</li>
        </ul>
      </CardContent>
    </Card>

    <Card v-if="report.dataGaps.length > 0">
      <CardHeader class="pb-2">
        <CardTitle class="text-base">数据缺口</CardTitle>
        <CardDescription>以下数据缺失或未接入，相关结论可能不完整</CardDescription>
      </CardHeader>
      <CardContent>
        <ul class="list-inside list-disc space-y-1 text-sm text-muted-foreground">
          <li v-for="(gap, i) in report.dataGaps" :key="i">{{ gap }}</li>
        </ul>
      </CardContent>
    </Card>

    <p class="text-xs text-muted-foreground">
      {{ report.disclaimer }}
    </p>
  </div>
</template>
