/**
 * GenerationScheduler 单元测试（Pipeline-only 实现）
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  GenerationScheduler,
  type SchedulerConfig,
  type GenerationTask,
} from '../scheduler'
import type { Classroom } from '@/services/openmaic/types'

const mockCache = {
  saveClassroom: vi.fn(),
  getClassroom: vi.fn(),
  listCachedClassrooms: vi.fn(),
  deleteClassroom: vi.fn(),
  clearExpiredCache: vi.fn(),
  clearAll: vi.fn(),
  getCacheSize: vi.fn(),
}

const mockPipelineClient = {
  runFullPipeline: vi.fn(),
}

const mockClassroom: Classroom = {
  id: 'classroom-001',
  title: 'Test Classroom',
  status: 'completed',
  scenes: [
    {
      id: 'scene-1',
      title: 'Intro',
      type: 'teaching',
      slides: [{ type: 'content', title: 'Hello', content: 'Let us learn!' }],
    },
  ],
}

function createScheduler(overrides: Partial<SchedulerConfig> = {}) {
  const config: SchedulerConfig = {
    pipelineClient: mockPipelineClient as SchedulerConfig['pipelineClient'],
    pipelineHeaders: { 'x-api-key': 'test' },
    retryIntervals: [1, 1, 1],
    maxRetries: 3,
    ...overrides,
  }
  return new GenerationScheduler(mockCache as never, config)
}

describe('GenerationScheduler', () => {
  let scheduler: GenerationScheduler

  beforeEach(() => {
    vi.clearAllMocks()
    mockPipelineClient.runFullPipeline.mockResolvedValue(mockClassroom)
    mockCache.saveClassroom.mockResolvedValue(undefined)
    scheduler = createScheduler()
  })

  describe('submitTask', () => {
    it('should create a generation task', () => {
      const task = scheduler.submitTask({
        knowledgeNodeId: 'kn-1',
        date: '2026-04-08',
        requirement: 'Teach counting 1-5',
      })

      expect(task).toBeDefined()
      expect(task.knowledgeNodeId).toBe('kn-1')
      expect(task.date).toBe('2026-04-08')
      expect(task.status).toBe('pending')
    })

    it('should assign unique IDs to tasks', () => {
      const task1 = scheduler.submitTask({
        knowledgeNodeId: 'kn-1',
        date: '2026-04-08',
        requirement: 'req 1',
      })
      const task2 = scheduler.submitTask({
        knowledgeNodeId: 'kn-2',
        date: '2026-04-08',
        requirement: 'req 2',
      })

      expect(task1.id).not.toBe(task2.id)
    })
  })

  describe('executeTasks', () => {
    it('should process all pending tasks', async () => {
      scheduler.submitTask({ knowledgeNodeId: 'kn-1', date: '2026-04-08', requirement: 'req 1' })
      scheduler.submitTask({ knowledgeNodeId: 'kn-2', date: '2026-04-08', requirement: 'req 2' })

      const results = await scheduler.executeTasks()

      expect(results).toHaveLength(2)
      expect(mockPipelineClient.runFullPipeline).toHaveBeenCalledTimes(2)
    })

    it('should call runFullPipeline with requirement', async () => {
      scheduler.submitTask({ knowledgeNodeId: 'kn-1', date: '2026-04-08', requirement: 'Test requirement' })
      await scheduler.executeTasks()

      expect(mockPipelineClient.runFullPipeline).toHaveBeenCalledWith(
        expect.objectContaining({
          requirements: expect.objectContaining({ requirement: 'Test requirement' }),
          headers: { 'x-api-key': 'test' },
        }),
      )
    })

    it('should save classroom to cache after pipeline success', async () => {
      scheduler.submitTask({ knowledgeNodeId: 'kn-1', date: '2026-04-08', requirement: 'req' })
      await scheduler.executeTasks()

      expect(mockCache.saveClassroom).toHaveBeenCalledWith('kn-1', 1, '2026-04-08', mockClassroom)
    })

    it('should mark task as completed on success', async () => {
      scheduler.submitTask({ knowledgeNodeId: 'kn-1', date: '2026-04-08', requirement: 'req' })
      const results = await scheduler.executeTasks()

      expect(results[0].status).toBe('completed')
    })

    it('should retry on failure up to maxRetries times', async () => {
      mockPipelineClient.runFullPipeline
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockClassroom)

      const s = createScheduler({ maxRetries: 3, retryIntervals: [1, 1, 1] })
      s.submitTask({ knowledgeNodeId: 'kn-1', date: '2026-04-08', requirement: 'req' })
      const results = await s.executeTasks()

      expect(results[0].status).toBe('completed')
      expect(mockPipelineClient.runFullPipeline).toHaveBeenCalledTimes(3)
    })

    it('should mark task as failed after max retries exhausted', async () => {
      mockPipelineClient.runFullPipeline.mockRejectedValue(new Error('Permanent error'))

      const s = createScheduler({ maxRetries: 2, retryIntervals: [1, 1] })
      s.submitTask({ knowledgeNodeId: 'kn-1', date: '2026-04-08', requirement: 'req' })
      const results = await s.executeTasks()

      expect(results[0].status).toBe('failed')
      expect(results[0].error).toContain('Permanent error')
    })
  })

  describe('getTaskStatus', () => {
    it('should return task status by knowledgeNodeId and date', () => {
      scheduler.submitTask({ knowledgeNodeId: 'kn-1', date: '2026-04-08', requirement: 'req' })

      const task = scheduler.getTaskStatus('kn-1', '2026-04-08')

      expect(task).toBeDefined()
      expect(task!.status).toBe('pending')
    })

    it('should return undefined for unknown task', () => {
      const task = scheduler.getTaskStatus('unknown', '2026-04-08')
      expect(task).toBeUndefined()
    })
  })

  describe('getPendingCount', () => {
    it('should return number of pending tasks', () => {
      scheduler.submitTask({ knowledgeNodeId: 'kn-1', date: '2026-04-08', requirement: 'req 1' })
      scheduler.submitTask({ knowledgeNodeId: 'kn-2', date: '2026-04-08', requirement: 'req 2' })

      expect(scheduler.getPendingCount()).toBe(2)
    })

    it('should return 0 when no tasks', () => {
      expect(scheduler.getPendingCount()).toBe(0)
    })
  })

  describe('clearTasks', () => {
    it('should remove all tasks', () => {
      scheduler.submitTask({ knowledgeNodeId: 'kn-1', date: '2026-04-08', requirement: 'req' })
      scheduler.clearTasks()
      expect(scheduler.getPendingCount()).toBe(0)
    })
  })

  describe('onPipelineProgress', () => {
    it('should forward pipeline progress callback', async () => {
      const onProgress = vi.fn()
      mockPipelineClient.runFullPipeline.mockImplementation(async (input: {
        callbacks?: { onProgress?: (p: { step: string; percent: number }) => void }
      }) => {
        input.callbacks?.onProgress?.({ step: 'outlines', percent: 20 })
        return mockClassroom
      })

      const s = createScheduler({ onPipelineProgress: onProgress, maxRetries: 1, retryIntervals: [1] })
      s.submitTask({ knowledgeNodeId: 'kn-1', date: '2026-04-08', requirement: 'Progress test' })
      await s.executeTasks()

      expect(onProgress).toHaveBeenCalledWith(
        expect.objectContaining({ step: 'outlines', percent: 20 }),
      )
    })
  })
})
