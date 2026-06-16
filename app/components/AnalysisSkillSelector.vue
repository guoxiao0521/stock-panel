<script setup lang="ts">
import type { AnalysisSkillId } from '#shared/types'
import { ANALYSIS_SKILLS } from '#shared/types'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const skillId = defineModel<AnalysisSkillId>('skillId', { required: true })
</script>

<template>
  <div class="space-y-2">
    <Label for="analysis-skill">分析类型</Label>
    <Select v-model="skillId">
      <SelectTrigger id="analysis-skill" class="w-full">
        <SelectValue placeholder="选择分析类型" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem
          v-for="skill in ANALYSIS_SKILLS"
          :key="skill.value"
          :value="skill.value"
        >
          {{ skill.label }}
        </SelectItem>
      </SelectContent>
    </Select>
    <p class="text-xs text-muted-foreground">
      {{ ANALYSIS_SKILLS.find(s => s.value === skillId)?.description }}
    </p>
  </div>
</template>
