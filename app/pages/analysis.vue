<script setup lang="ts">
import { SparklesIcon } from '@lucide/vue'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

// Phase 3 预留入口，对应 PRD 第 9 节，仅展示 TODO
const todos = [
  '定义 AI 分析输入数据：行情、财务、新闻、技术指标、宏观指标。',
  '定义 Skill 调用方式与安全边界。',
  '设计个股分析报告结构。',
  '设计支撑位、压力位、趋势判断的计算与解释方式。',
  '增加免责声明：AI 输出仅供研究参考，不构成投资建议。',
  '评估是否需要保存 AI 分析历史。',
]
</script>

<template>
  <div class="mx-auto max-w-screen-2xl space-y-4 px-4 py-6 lg:px-6">
    <div>
      <h1 class="text-xl font-semibold tracking-tight">AI 分析</h1>
      <p class="text-sm text-muted-foreground">
        预留 AI + Skill 辅助分析入口，第一、二阶段不实现完整功能。
      </p>
    </div>

    <Card>
      <CardHeader>
        <CardTitle class="flex items-center gap-2">
          <SparklesIcon class="size-5 text-primary" />
          规划中
        </CardTitle>
        <CardDescription>Phase 3 待办事项</CardDescription>
      </CardHeader>
      <CardContent>
        <ul class="space-y-2 text-sm">
          <li v-for="(item, i) in todos" :key="i" class="flex gap-2">
            <span class="text-muted-foreground">TODO</span>
            <span>{{ item }}</span>
          </li>
        </ul>
      </CardContent>
    </Card>

    <p class="text-xs text-muted-foreground">
      免责声明：本工具仅供个人研究参考，不构成投资建议；数据可能延迟、缺失或不准确。
    </p>
  </div>
</template>
