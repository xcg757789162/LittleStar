/**
 * TPR 指令 React Query Hooks
 *
 * 从 PostgREST API 查询 TPR 指令数据（tpr_instructions 表）。
 * 替代原先从 `english-tpr.ts` 硬编码获取的方式。
 */

import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/services/api'
import type { TPRInstruction, TPRCommand, TPRAnimationType } from '@/services/api/types'

/** 分类到动画类型的默认映射 */
const CATEGORY_ANIMATION: Record<string, TPRAnimationType> = {
  body: 'clap',
  move: 'jump',
  face: 'touch',
  object: 'wave',
}

/** 将 TPRInstruction 转换为 TPRCommand */
function toTPRCommand(instruction: TPRInstruction): TPRCommand {
  return {
    id: instruction.id,
    command: instruction.command,
    chineseHint: instruction.translation,
    emoji: instruction.emoji,
    animationType:
      instruction.animationType ?? CATEGORY_ANIMATION[instruction.category] ?? 'clap',
  }
}

/** 查询所有 TPR 指令 */
export function useTPRInstructions(category?: string) {
  return useQuery({
    queryKey: ['tprInstructions', category],
    queryFn: () => {
      const filters: Array<{ column: string; operator: 'eq'; value: string | number | boolean | null | (string | number)[] }> = [
        { column: 'isActive', operator: 'eq', value: true },
      ]
      if (category) {
        filters.push({ column: 'category', operator: 'eq', value: category })
      }
      return apiClient.get<TPRInstruction>('/tpr_instructions', { filters })
    },
    staleTime: 24 * 60 * 60 * 1000, // 24 小时缓存
  })
}

/**
 * 获取随机 TPR 指令序列（非 hook，直接函数调用）
 */
export async function fetchRandomTPRSequence(
  count: number,
  category?: string,
): Promise<TPRInstruction[]> {
  const filters: Array<{ column: string; operator: string; value: string | boolean }> = [
    { column: 'isActive', operator: 'eq', value: true },
  ]
  if (category) {
    filters.push({ column: 'category', operator: 'eq', value: category })
  }

  const instructions = await apiClient.get<TPRInstruction>('/tpr_instructions', {
    filters: filters as Array<{ column: string; operator: 'eq'; value: string | number | boolean | null | (string | number)[] }>,
  })

  const shuffled = [...instructions].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(count, shuffled.length))
}

/**
 * 获取单个随机 TPR 指令命令（非 hook，直接函数调用）
 * 供课堂 TPR 活动使用
 */
export async function fetchRandomTPR(): Promise<TPRCommand> {
  const instructions = await apiClient.get<TPRInstruction>('/tpr_instructions', {
    filters: [{ column: 'isActive', operator: 'eq', value: true }],
  })

  const idx = Math.floor(Math.random() * instructions.length)
  return toTPRCommand(instructions[idx])
}
