import type { AnalysisReport, AnalysisSkillId, HistoryRange } from '#shared/types'
import { ref } from 'vue'

/**
 * AI 分析状态管理（Phase 3）。
 * 调用 POST /api/analysis/run，由服务端 analysis-service 组装上下文并生成报告。
 */
export function useAnalysis() {
  const selectedSymbol = ref('')
  const selectedSkillId = ref<AnalysisSkillId>('overview')
  const range = ref<HistoryRange>('1Y')
  const report = ref<AnalysisReport | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function run(symbol?: string, skillId?: AnalysisSkillId) {
    const sym = (symbol ?? selectedSymbol.value).trim().toUpperCase()
    if (!sym) {
      error.value = '请选择或输入股票代码'
      return null
    }

    const skill = skillId ?? selectedSkillId.value
    selectedSymbol.value = sym
    selectedSkillId.value = skill
    loading.value = true
    error.value = null

    try {
      const data = await $fetch<{ report: AnalysisReport }>('/api/analysis/run', {
        method: 'POST',
        body: {
          symbol: sym,
          skillId: skill,
          range: range.value,
          forceRefresh: true,
        },
      })
      report.value = data.report
      return data.report
    }
    catch (e: unknown) {
      const err = e as { statusMessage?: string, data?: { statusMessage?: string } }
      error.value = err.data?.statusMessage ?? err.statusMessage ?? '分析失败'
      report.value = null
      return null
    }
    finally {
      loading.value = false
    }
  }

  function reset() {
    report.value = null
    error.value = null
  }

  return {
    selectedSymbol,
    selectedSkillId,
    range,
    report,
    loading,
    error,
    run,
    reset,
  }
}
