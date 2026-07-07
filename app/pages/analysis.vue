<script setup lang="ts">
import { AlertTriangleIcon, LoaderCircleIcon, SparklesIcon } from '@lucide/vue'
import { computed, onMounted, ref } from 'vue'
import { toast } from 'vue-sonner'
import AnalysisReport from '@/components/AnalysisReport.vue'
import AnalysisSkillSelector from '@/components/AnalysisSkillSelector.vue'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'

const route = useRoute()
const { items, load: loadWatchlist } = useWatchlist()
const {
  selectedSymbol,
  selectedSkillId,
  report,
  loading,
  error,
  run,
  reset,
} = useAnalysis()

const manualSymbol = ref('')

const symbolOptions = computed(() =>
  items.value.map(row => ({
    value: row.symbol,
    label: row.name ? `${row.symbol} · ${row.name}` : row.symbol,
  })),
)

async function handleRun() {
  const symbol = selectedSymbol.value || manualSymbol.value
  const result = await run(symbol, selectedSkillId.value)
  if (result)
    toast.success(`${result.symbol} 分析完成`)
  else if (error.value)
    toast.error(error.value)
}

onMounted(async () => {
  await loadWatchlist()
  const querySymbol = route.query.symbol
  if (typeof querySymbol === 'string' && querySymbol.trim())
    selectedSymbol.value = querySymbol.trim().toUpperCase()
  else if (symbolOptions.value.length > 0 && !selectedSymbol.value)
    selectedSymbol.value = symbolOptions.value[0]!.value
})
</script>

<template>
  <div class="mx-auto max-w-screen-2xl space-y-4 px-4 py-6 lg:px-6">
    <div>
      <h1 class="text-xl font-semibold tracking-tight">AI 分析</h1>
      <p class="text-sm text-muted-foreground">
        基于 finance-skills 方法论的结构化分析，当前使用模板 runner（无需外部 LLM）。
      </p>
    </div>

    <div class="grid gap-4 lg:grid-cols-[320px_1fr]">
      <Card class="h-fit">
        <CardHeader>
          <CardTitle class="flex items-center gap-2 text-base">
            <SparklesIcon class="size-4 text-primary" />
            分析配置
          </CardTitle>
          <CardDescription>选择股票与分析类型后生成报告</CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div v-if="symbolOptions.length > 0" class="space-y-2">
            <Label for="analysis-symbol">自选股</Label>
            <Select v-model="selectedSymbol">
              <SelectTrigger id="analysis-symbol" class="w-full">
                <SelectValue placeholder="选择股票" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="opt in symbolOptions"
                  :key="opt.value"
                  :value="opt.value"
                >
                  {{ opt.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div v-else class="space-y-2">
            <Label for="analysis-manual-symbol">股票代码</Label>
            <Input
              id="analysis-manual-symbol"
              v-model="manualSymbol"
              placeholder="例如 AAPL"
              class="uppercase"
            />
            <p class="text-xs text-muted-foreground">
              自选股为空，可直接输入 ticker 进行分析。
            </p>
          </div>

          <AnalysisSkillSelector v-model:skill-id="selectedSkillId" />

          <div class="flex gap-2">
            <Button class="flex-1" :disabled="loading" @click="handleRun">
              <LoaderCircleIcon v-if="loading" class="size-4 animate-spin" />
              <SparklesIcon v-else class="size-4" />
              生成分析
            </Button>
            <Button variant="outline" :disabled="loading || !report" @click="reset">
              清除
            </Button>
          </div>
        </CardContent>
      </Card>

      <div class="min-w-0 space-y-4">
        <div
          v-if="error"
          class="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          <AlertTriangleIcon class="size-4 shrink-0" />
          <span>{{ error }}</span>
        </div>

        <template v-if="loading">
          <Skeleton class="h-32 w-full rounded-xl" />
          <Skeleton class="h-48 w-full rounded-xl" />
          <Skeleton class="h-48 w-full rounded-xl" />
        </template>

        <AnalysisReport v-else-if="report" :report="report" />

        <Card v-else>
          <CardHeader>
            <CardTitle class="text-base">开始分析</CardTitle>
            <CardDescription>
              选择自选股或输入 ticker，再点击「生成分析」。支持综合概览、SEPA 趋势、财报预览与流动性分析。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p class="text-sm text-muted-foreground">
              方法论来源：
              <a
                href="https://github.com/himself65/finance-skills"
                target="_blank"
                rel="noopener noreferrer"
                class="text-primary underline-offset-4 hover:underline"
              >
                finance-skills
              </a>
              （MIT）。当前为模板 runner，后续可接入 OpenAI / Claude / Funda。
            </p>
          </CardContent>
        </Card>
      </div>
    </div>

    <p class="text-xs text-muted-foreground">
      免责声明：本工具仅供个人研究参考，不构成投资建议；数据可能延迟、缺失或不准确。
    </p>
  </div>
</template>
