/**
 * GenerationScheduler 单元测试
 *
 * 测试批量提交生成、轮询管理、缓存写入、失败重试逻辑。
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  GenerationScheduler,
  type SchedulerConfig,
  type GenerationTask,
} from '../scheduler'
import type { Classroom } from '@/services/openmaic/types'

// Mock OpenMAIC Client
const mockClient = {
  generateClassroom: vi.fn(),
  pollUntilComplete: vi.fn(),
  getClassroom: vi.fn(),
  getClassroomStatus: vi.fn(),
  checkHealth: vi.fn(),
}

// Mock ClassroomCache
const mockCache = {
  saveClassroom: vi.fn(),
  getClassroom: vi.fn(),
  listCachedClassrooms: vi.fn(),
  deleteClassroom: vi.fn(),
  clearExpiredCache: vi.fn(),
  clearAll: vi.fn(),
  getCacheSize: vi.fn(),
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

describe('GenerationScheduler', () => {
  let scheduler: GenerationScheduler

  beforeEach(() => {
    vi.clearAllMocks()
    scheduler = new GenerationScheduler(
      mockClient as any,
      mockCache as any,
      { retryIntervals: [1, 1, 1], maxRetries: 3 },
    )
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
      mockClient.generateClassroom.mockResolvedValue({ classroomId: 'cr-1', status: 'pending' })
      mockClient.pollUntilComplete.mockResolvedValue(mockClassroom)
      mockCache.saveClassroom.mockResolvedValue(undefined)

      scheduler.submitTask({ knowledgeNodeId: 'kn-1', date: '2026-04-08', requirement: 'req 1' })
      scheduler.submitTask({ knowledgeNodeId: 'kn-2', date: '2026-04-08', requirement: 'req 2' })

      const results = await scheduler.executeTasks()

      expect(results).toHaveLength(2)
      expect(mockClient.generateClassroom).toHaveBeenCalledTimes(2)
    })

    it('should call generateClassroom with requirement', async () => {
      mockClient.generateClassroom.mockResolvedValue({ classroomId: 'cr-1', status: 'pending' })
      mockClient.pollUntilComplete.mockResolvedValue(mockClassroom)
      mockCache.saveClassroom.mockResolvedValue(undefined)

      scheduler.submitTask({ knowledgeNodeId: 'kn-1', date: '2026-04-08', requirement: 'Test requirement' })
      await scheduler.executeTasks()

      expect(mockClient.generateClassroom).toHaveBeenCalledWith(
        expect.objectContaining({ requirement: 'Test requirement' }),
      )
    })

    it('should poll until complete and save to cache', async () => {
      mockClient.generateClassroom.mockResolvedValue({ classroomId: 'cr-1', status: 'pending' })
      mockClient.pollUntilComplete.mockResolvedValue(mockClassroom)
      mockCache.saveClassroom.mockResolvedValue(undefined)

      scheduler.submitTask({ knowledgeNodeId: 'kn-1', date: '2026-04-08', requirement: 'req' })
      await scheduler.executeTasks()

      expect(mockClient.pollUntilComplete).toHaveBeenCalledWith('cr-1', expect.any(Object))
      expect(mockCache.saveClassroom).toHaveBeenCalledWith('kn-1', 1, '2026-04-08', mockClassroom)
    })

    it('should mark task as completed on success', async () => {
      mockClient.generateClassroom.mockResolvedValue({ classroomId: 'cr-1', status: 'pending' })
      mockClient.pollUntilComplete.mockResolvedValue(mockClassroom)
      mockCache.saveClassroom.mockResolvedValue(undefined)

      scheduler.submitTask({ knowledgeNodeId: 'kn-1', date: '2026-04-08', requirement: 'req' })
      const results = await scheduler.executeTasks()

      expect(results[0].status).toBe('completed')
    })

    it('should retry on failure up to maxRetries times', async () => {
      mockClient.generateClassroom
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ classroomId: 'cr-1', status: 'pending' })
      mockClient.pollUntilComplete.mockResolvedValue(mockClassroom)
      mockCache.saveClassroom.mockResolvedValue(undefined)

      const customScheduler = new GenerationScheduler(
        mockClient as any,
        mockCache as any,
        { maxRetries: 3, retryIntervals: [1, 1, 1] },
      )

      customScheduler.submitTask({ knowledgeNodeId: 'kn-1', date: '2026-04-08', requirement: 'req' })
      const results = await customScheduler.executeTasks()

      expect(results[0].status).toBe('completed')
      expect(mockClient.generateClassroom).toHaveBeenCalledTimes(3)
    })

    it('should mark task as failed after max retries exhausted', async () => {
      mockClient.generateClassroom.mockRejectedValue(new Error('Permanent error'))

      const customScheduler = new GenerationScheduler(
        mockClient as any,
        mockCache as any,
        { maxRetries: 3, retryIntervals: [1, 1, 1] },
      )

      customScheduler.submitTask({ knowledgeNodeId: 'kn-1', date: '2026-04-08', requirement: 'req' })
      const results = await customScheduler.executeTasks()

      expect(results[0].status).toBe('failed')
      expect(results[0].error).toContain('Permanent error')
    })

    it('should handle poll failure', async () => {
      mockClient.generateClassroom.mockResolvedValue({ classroomId: 'cr-1', status: 'pending' })
      mockClient.pollUntilComplete.mockRejectedValue(new Error('Generation timed out'))

      scheduler.submitTask({ knowledgeNodeId: 'kn-1', date: '2026-04-08', requirement: 'req' })
      const results = await scheduler.executeTasks()

      expect(results[0].status).toBe('failed')
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

  describe('Pipeline Client integration', () => {
    const mockPipelineClient = {
      runFullPipeline: vi.fn(),
      generateOutlines: vi.fn(),
      generateSceneContent: vi.fn(),
      generateSceneActions: vi.fn(),
      generateTTS: vi.fn(),
    }

    const pipelineClassroom: Classroom = {
      id: 'pipeline-1234',
      title: 'Pipeline Classroom',
      status: 'completed',
      scenes: [
        {
          id: 'scene-1',
          title: 'Pipeline Scene',
          type: 'teaching',
          slides: [{ type: 'content', title: 'Hello', content: 'Pipeline generated' }],
        },
      ],
    }

    it('should use Pipeline Client when provided', async () => {
      mockPipelineClient.runFullPipeline.mockResolvedValue(pipelineClassroom)
      mockCache.saveClassroom.mockResolvedValue(undefined)

      const pipelineScheduler = new GenerationScheduler(
        mockClient as any,
        mockCache as any,
        {
          retryIntervals: [1, 1, 1],
          maxRetries: 3,
          pipelineClient: mockPipelineClient as any,
          pipelineHeaders: { 'x-model': 'gpt-4o', 'x-api-key': 'test' },
        },
      )

      pipelineScheduler.submitTask({
        knowledgeNodeId: 'kn-1',
        date: '2026-04-08',
        requirement: 'Pipeline test',
      })
      const results = await pipelineScheduler.executeTasks()

      expect(results[0].status).toBe('completed')
      expect(mockPipelineClient.runFullPipeline).toHaveBeenCalled()
      // Should NOT use old API when pipeline succeeds
      expect(mockClient.generateClassroom).not.toHaveBeenCalled()
    })

    it('should pass correct requirements and headers to Pipeline Client', async () => {
      mockPipelineClient.runFullPipeline.mockResolvedValue(pipelineClassroom)
      mockCache.saveClassroom.mockResolvedValue(undefined)

      const headers = { 'x-model': 'openai:gpt-4o', 'x-api-key': 'sk-test' }

      const pipelineScheduler = new GenerationScheduler(
        mockClient as any,
        mockCache as any,
        {
          retryIntervals: [1],
          maxRetries: 1,
          pipelineClient: mockPipelineClient as any,
          pipelineHeaders: headers,
        },
      )

      pipelineScheduler.submitTask({
        knowledgeNodeId: 'kn-1',
        date: '2026-04-08',
        requirement: 'Teach counting',
        language: 'en',
      })
      await pipelineScheduler.executeTasks()

      expect(mockPipelineClient.runFullPipeline).toHaveBeenCalledWith(
        expect.objectContaining({
          requirements: expect.objectContaining({
            requirement: 'Teach counting',
            language: 'en',
          }),
          headers,
        }),
      )
    })

    it('should fallback to old API when Pipeline Client fails on outlines step', async () => {
      mockPipelineClient.runFullPipeline.mockRejectedValue(new Error('Pipeline outlines failed'))
      mockClient.generateClassroom.mockResolvedValue({ classroomId: 'cr-fallback', status: 'pending' })
      mockClient.pollUntilComplete.mockResolvedValue(mockClassroom)
      mockCache.saveClassroom.mockResolvedValue(undefined)

      const pipelineScheduler = new GenerationScheduler(
        mockClient as any,
        mockCache as any,
        {
          retryIntervals: [1],
          maxRetries: 1,
          pipelineClient: mockPipelineClient as any,
          pipelineHeaders: { 'x-model': 'gpt-4o', 'x-api-key': 'test' },
        },
      )

      pipelineScheduler.submitTask({
        knowledgeNodeId: 'kn-1',
        date: '2026-04-08',
        requirement: 'Fallback test',
      })
      const results = await pipelineScheduler.executeTasks()

      // Pipeline failed → should fallback to old API
      expect(results[0].status).toBe('completed')
      expect(mockPipelineClient.runFullPipeline).toHaveBeenCalled()
      expect(mockClient.generateClassroom).toHaveBeenCalled()
    })

    it('should not use Pipeline Client when not provided', async () => {
      mockClient.generateClassroom.mockResolvedValue({ classroomId: 'cr-1', status: 'pending' })
      mockClient.pollUntilComplete.mockResolvedValue(mockClassroom)
      mockCache.saveClassroom.mockResolvedValue(undefined)

      const plainScheduler = new GenerationScheduler(
        mockClient as any,
        mockCache as any,
        { retryIntervals: [1], maxRetries: 1 },
      )

      plainScheduler.submitTask({
        knowledgeNodeId: 'kn-1',
        date: '2026-04-08',
        requirement: 'Old API only',
      })
      const results = await plainScheduler.executeTasks()

      expect(results[0].status).toBe('completed')
      expect(mockClient.generateClassroom).toHaveBeenCalled()
    })

    it('should invoke onPipelineProgress callback during pipeline execution', async () => {
      const onProgress = vi.fn()
      mockPipelineClient.runFullPipeline.mockImplementation(async (input: any) => {
        // Simulate pipeline calling back with progress
        input.callbacks?.onProgress?.({ step: 'outlines', percent: 20, message: 'generating...' })
        return pipelineClassroom
      })
      mockCache.saveClassroom.mockResolvedValue(undefined)

      const pipelineScheduler = new GenerationScheduler(
        mockClient as any,
        mockCache as any,
        {
          retryIntervals: [1],
          maxRetries: 1,
          pipelineClient: mockPipelineClient as any,
          pipelineHeaders: { 'x-model': 'gpt-4o', 'x-api-key': 'test' },
          onPipelineProgress: onProgress,
        },
      )

      pipelineScheduler.submitTask({
        knowledgeNodeId: 'kn-1',
        date: '2026-04-08',
        requirement: 'Progress test',
      })
      await pipelineScheduler.executeTasks()

      expect(onProgress).toHaveBeenCalledWith(
        expect.objectContaining({ step: 'outlines', percent: 20 }),
      )
    })
  })
})
