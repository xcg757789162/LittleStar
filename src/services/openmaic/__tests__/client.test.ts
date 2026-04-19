import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { OpenMAICClient } from '../client'
import type {
  GenerateClassroomRequest,
  GenerateClassroomResponse,
  ClassroomStatusResponse,
  Classroom,
} from '../types'

// Mock global fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('OpenMAICClient', () => {
  let client: OpenMAICClient

  beforeEach(() => {
    client = new OpenMAICClient({ baseUrl: 'http://localhost:3000' })
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('constructor', () => {
    it('should create client with default baseUrl', () => {
      const defaultClient = new OpenMAICClient()
      expect(defaultClient).toBeDefined()
    })

    it('should create client with custom baseUrl', () => {
      const customClient = new OpenMAICClient({ baseUrl: 'http://example.com:4000' })
      expect(customClient).toBeDefined()
    })
  })

  describe('generateClassroom', () => {
    it('should submit a classroom generation request', async () => {
      const mockResponse: GenerateClassroomResponse = {
        classroomId: 'classroom-123',
        status: 'pending',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const request: GenerateClassroomRequest = {
        requirement: 'Teach numbers 1-5 to a 5 year old',
      }

      const result = await client.generateClassroom(request)

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/generate-classroom',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify(request),
        })
      )
      expect(result.classroomId).toBe('classroom-123')
      expect(result.status).toBe('pending')
    })

    it('should throw on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(
        client.generateClassroom({ requirement: 'test' })
      ).rejects.toThrow('Network error')
    })

    it('should throw on non-OK response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'Server error' }),
      })

      await expect(
        client.generateClassroom({ requirement: 'test' })
      ).rejects.toThrow()
    })
  })

  describe('getClassroom', () => {
    it('should fetch classroom data by ID', async () => {
      const mockClassroom: Classroom = {
        id: 'classroom-123',
        title: 'Numbers 1-5',
        status: 'completed',
        scenes: [
          {
            id: 'scene-1',
            title: 'Introduction',
            type: 'teaching',
            slides: [
              { type: 'content', title: 'Hello!', content: 'Let us learn!' },
            ],
          },
        ],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockClassroom,
      })

      const result = await client.getClassroom('classroom-123')

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/classroom?id=classroom-123',
        expect.objectContaining({ method: 'GET' })
      )
      expect(result.id).toBe('classroom-123')
      expect(result.scenes).toHaveLength(1)
    })

    it('should throw on 404 not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ error: 'Classroom not found' }),
      })

      await expect(client.getClassroom('nonexistent')).rejects.toThrow()
    })
  })

  describe('getClassroomStatus', () => {
    it('should return processing status with progress', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'running', progress: 60 }),
      })

      const result = await client.getClassroomStatus('classroom-123')

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/generate-classroom/classroom-123',
        expect.objectContaining({ method: 'GET' }),
      )
      expect(result.status).toBe('processing')
      expect(result.progress).toBe(0.6)
    })

    it('should return completed status with classroom data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'succeeded',
          done: true,
          result: { classroomId: 'classroom-123' },
          message: 'Test',
        }),
      })

      const result = await client.getClassroomStatus('classroom-123')

      expect(result.status).toBe('completed')
      expect(result.classroom).toBeDefined()
      expect(result.classroom!.id).toBe('classroom-123')
    })

    it('should return failed status with error message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'failed',
          error: 'LLM API quota exceeded',
        }),
      })

      const result = await client.getClassroomStatus('classroom-123')

      expect(result.status).toBe('failed')
      expect(result.error).toBe('LLM API quota exceeded')
    })
  })

  describe('pollUntilComplete', () => {
    it('should poll and return classroom when completed', async () => {
      const fullClassroom: Classroom = {
        id: 'classroom-123',
        title: 'Complete Classroom',
        status: 'completed',
        scenes: [],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'running', progress: 50 }),
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'succeeded',
          done: true,
          result: { classroomId: 'classroom-123' },
          message: 'Complete Classroom',
        }),
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => fullClassroom,
      })

      const result = await client.pollUntilComplete('classroom-123', {
        intervalMs: 10,
        maxAttempts: 5,
      })

      expect(result).toBeDefined()
      expect(result.id).toBe('classroom-123')
      expect(mockFetch).toHaveBeenCalledTimes(3)
    })

    it('should throw after max attempts exceeded', async () => {
      // Always return processing
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'processing',
          progress: 0.3,
        } as ClassroomStatusResponse),
      })

      await expect(
        client.pollUntilComplete('classroom-123', {
          intervalMs: 10,
          maxAttempts: 3,
        })
      ).rejects.toThrow(/max attempts/i)
    })

    it('should throw immediately on failed status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'failed',
          error: 'Generation failed',
        } as ClassroomStatusResponse),
      })

      await expect(
        client.pollUntilComplete('classroom-123', {
          intervalMs: 10,
          maxAttempts: 5,
        })
      ).rejects.toThrow(/generation failed/i)
    })

    it('should invoke onProgress callback with progress value', async () => {
      const fullClassroom: Classroom = {
        id: 'classroom-456',
        title: 'Progress Classroom',
        status: 'completed',
        scenes: [],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'running', progress: 30 }),
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'running', progress: 70 }),
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'succeeded',
          done: true,
          result: { classroomId: 'classroom-456' },
          message: 'Progress Classroom',
        }),
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => fullClassroom,
      })

      const onProgress = vi.fn()

      await client.pollUntilComplete('classroom-456', {
        intervalMs: 10,
        maxAttempts: 10,
        onProgress,
      })

      expect(onProgress).toHaveBeenCalledTimes(2)
      expect(onProgress).toHaveBeenCalledWith(0.3)
      expect(onProgress).toHaveBeenCalledWith(0.7)
    })

    it('should not invoke onProgress when progress is undefined', async () => {
      const fullClassroom: Classroom = {
        id: 'classroom-789',
        title: 'No Progress Classroom',
        status: 'completed',
        scenes: [],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'running' }),
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'succeeded',
          done: true,
          result: { classroomId: 'classroom-789' },
          message: 'No Progress Classroom',
        }),
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => fullClassroom,
      })

      const onProgress = vi.fn()

      await client.pollUntilComplete('classroom-789', {
        intervalMs: 10,
        maxAttempts: 5,
        onProgress,
      })

      expect(onProgress).not.toHaveBeenCalled()
    })
  })

  describe('timeout handling', () => {
    it('should throw a timeout error when fetch takes too long', async () => {
      const slowClient = new OpenMAICClient({
        baseUrl: 'http://localhost:3000',
        timeoutMs: 50,
      })

      // Simulate a slow fetch by never resolving within the timeout
      mockFetch.mockImplementationOnce(
        (_url: string, init?: RequestInit) =>
          new Promise((resolve, reject) => {
            const signal = init?.signal
            if (signal) {
              signal.addEventListener('abort', () => {
                reject(new DOMException('The operation was aborted.', 'AbortError'))
              })
            }
            // Never resolve — rely on abort signal
          })
      )

      await expect(
        slowClient.generateClassroom({ requirement: 'test' })
      ).rejects.toThrow(/timed out/i)
    })

    it('should pass abort signal to fetch calls', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'classroom-123',
          title: 'Test',
          status: 'completed',
          scenes: [],
        }),
      })

      await client.getClassroom('classroom-123')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        })
      )
    })
  })

  describe('classroomId validation', () => {
    it('should reject empty classroomId', async () => {
      await expect(client.getClassroom('')).rejects.toThrow(/invalid classroomId/i)
    })

    it('should reject classroomId with path traversal characters', async () => {
      await expect(client.getClassroom('../admin')).rejects.toThrow(/invalid classroomId/i)
    })

    it('should reject classroomId with slashes', async () => {
      await expect(client.getClassroom('foo/bar')).rejects.toThrow(/invalid classroomId/i)
    })

    it('should reject classroomId with query string', async () => {
      await expect(client.getClassroom('id?param=val')).rejects.toThrow(/invalid classroomId/i)
    })

    it('should accept valid classroomId with alphanumeric, hyphens, underscores', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'classroom-abc_123',
          title: 'Test',
          status: 'completed',
          scenes: [],
        }),
      })

      const result = await client.getClassroom('classroom-abc_123')
      expect(result.id).toBe('classroom-abc_123')
    })

    it('should validate classroomId in getClassroomStatus', async () => {
      await expect(client.getClassroomStatus('../evil')).rejects.toThrow(/invalid classroomId/i)
    })

    it('should validate classroomId in pollUntilComplete', async () => {
      await expect(
        client.pollUntilComplete('../evil', { intervalMs: 10, maxAttempts: 1 })
      ).rejects.toThrow(/invalid classroomId/i)
    })
  })

  describe('checkHealth', () => {
    it('should return true when service is healthy', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
      })

      const result = await client.checkHealth()
      expect(result).toBe(true)
    })

    it('should return false when service is down', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'))

      const result = await client.checkHealth()
      expect(result).toBe(false)
    })

    it('should return false on non-OK response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
      })

      const result = await client.checkHealth()
      expect(result).toBe(false)
    })
  })
})
