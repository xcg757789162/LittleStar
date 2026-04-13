import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ClassroomCache } from '../cache'
import type { Classroom } from '../types'

// 测试用课堂数据
function createMockClassroom(overrides: Partial<Classroom> = {}): Classroom {
  return {
    id: 'classroom-001',
    title: 'Numbers 1-5',
    status: 'completed',
    scenes: [
      {
        id: 'scene-1',
        title: 'Introduction',
        type: 'slide',
        content: {
          type: 'slide',
          canvas: {
            elements: [{ type: 'text', content: '<p>Let us learn!</p>' }],
          },
        },
        actions: [],
      },
    ],
    ...overrides,
  }
}

function createLegacyClassroom(overrides: Partial<Classroom> = {}): Classroom {
  return {
    id: 'legacy-classroom-001',
    title: 'Legacy Numbers 1-5',
    status: 'completed',
    scenes: [
      {
        id: 'legacy-scene-1',
        title: 'Legacy Introduction',
        type: 'teaching',
        slides: [
          {
            type: 'content',
            title: 'Legacy Hello',
            content: 'Let us learn!',
            imageUrl: 'https://example.com/legacy.png',
            audioUrl: 'https://example.com/legacy.mp3',
          },
        ],
      },
    ],
    ...overrides,
  }
}

describe('ClassroomCache', () => {
  let cache: ClassroomCache

  beforeEach(() => {
    cache = new ClassroomCache()
  })

  afterEach(async () => {
    await cache.clearAll()
  })

  describe('saveClassroom', () => {
    it('should save a classroom with knowledgeNodeId and date', async () => {
      const classroom = createMockClassroom()

      await cache.saveClassroom('kn-counting-1-5', '2026-04-08', classroom)

      const retrieved = await cache.getClassroom('kn-counting-1-5', '2026-04-08')
      expect(retrieved).toBeDefined()
      expect(retrieved!.id).toBe('classroom-001')
      expect(retrieved!.title).toBe('Numbers 1-5')
    })

    it('should overwrite existing classroom for same key', async () => {
      const classroom1 = createMockClassroom({ title: 'Version 1' })
      const classroom2 = createMockClassroom({ title: 'Version 2' })

      await cache.saveClassroom('kn-test', '2026-04-08', classroom1)
      await cache.saveClassroom('kn-test', '2026-04-08', classroom2)

      const retrieved = await cache.getClassroom('kn-test', '2026-04-08')
      expect(retrieved!.title).toBe('Version 2')
    })
  })

  describe('getClassroom', () => {
    it('should return null for non-existent classroom', async () => {
      const result = await cache.getClassroom('nonexistent', '2026-04-08')
      expect(result).toBeNull()
    })

    it('should retrieve classroom by knowledgeNodeId and date', async () => {
      const classroom = createMockClassroom({ id: 'cr-123', title: 'Animals' })
      await cache.saveClassroom('kn-animals', '2026-04-09', classroom)

      const result = await cache.getClassroom('kn-animals', '2026-04-09')
      expect(result).toBeDefined()
      expect(result!.id).toBe('cr-123')
    })

    it('should not cross-match different dates', async () => {
      const classroom = createMockClassroom()
      await cache.saveClassroom('kn-test', '2026-04-08', classroom)

      const result = await cache.getClassroom('kn-test', '2026-04-09')
      expect(result).toBeNull()
    })
  })

  describe('listCachedClassrooms', () => {
    it('should return empty array when no classrooms cached', async () => {
      const list = await cache.listCachedClassrooms()
      expect(list).toEqual([])
    })

    it('should list all cached classrooms', async () => {
      await cache.saveClassroom('kn-1', '2026-04-08', createMockClassroom({ id: 'c1' }))
      await cache.saveClassroom('kn-2', '2026-04-08', createMockClassroom({ id: 'c2' }))
      await cache.saveClassroom('kn-3', '2026-04-09', createMockClassroom({ id: 'c3' }))

      const list = await cache.listCachedClassrooms()
      expect(list).toHaveLength(3)
    })

    it('should filter by date when provided', async () => {
      await cache.saveClassroom('kn-1', '2026-04-08', createMockClassroom({ id: 'c1' }))
      await cache.saveClassroom('kn-2', '2026-04-09', createMockClassroom({ id: 'c2' }))

      const list = await cache.listCachedClassrooms('2026-04-08')
      expect(list).toHaveLength(1)
      expect(list[0].knowledgeNodeId).toBe('kn-1')
    })

    it('should hide placeholder classrooms without renderable scenes from the lesson list', async () => {
      await cache.saveClassroom('kn-valid', '2026-04-08', createMockClassroom({ id: 'valid-1', title: '数字王国' }))
      await cache.saveClassroom('kn-invalid', '2026-04-08', createMockClassroom({
        id: 'invalid-1',
        title: 'Generated Classroom',
        scenes: [],
      }))

      const list = await cache.listCachedClassrooms()
      expect(list).toHaveLength(1)
      expect(list[0].knowledgeNodeId).toBe('kn-valid')
    })

    it('should evict legacy classrooms that only contain scene.slides from the lesson list', async () => {
      await cache.saveClassroom('kn-legacy', '2026-04-08', createLegacyClassroom({ id: 'legacy-1' }))

      await expect(cache.listCachedClassrooms()).resolves.toEqual([])
      await expect(cache.getClassroom('kn-legacy', '2026-04-08')).resolves.toBeNull()
    })
  })

  describe('deleteClassroom', () => {
    it('should delete a specific cached classroom', async () => {
      await cache.saveClassroom('kn-test', '2026-04-08', createMockClassroom())

      await cache.deleteClassroom('kn-test', '2026-04-08')

      const result = await cache.getClassroom('kn-test', '2026-04-08')
      expect(result).toBeNull()
    })

    it('should not throw when deleting non-existent classroom', async () => {
      await expect(
        cache.deleteClassroom('nonexistent', '2026-04-08')
      ).resolves.not.toThrow()
    })
  })

  describe('clearExpiredCache', () => {
    it('should remove classrooms older than specified date', async () => {
      await cache.saveClassroom('kn-old', '2026-04-05', createMockClassroom({ id: 'old' }))
      await cache.saveClassroom('kn-recent', '2026-04-08', createMockClassroom({ id: 'recent' }))

      await cache.clearExpiredCache('2026-04-07')

      const oldResult = await cache.getClassroom('kn-old', '2026-04-05')
      const recentResult = await cache.getClassroom('kn-recent', '2026-04-08')

      expect(oldResult).toBeNull()
      expect(recentResult).toBeDefined()
      expect(recentResult!.id).toBe('recent')
    })

    it('should not remove classrooms on or after the cutoff date', async () => {
      await cache.saveClassroom('kn-exact', '2026-04-07', createMockClassroom({ id: 'exact' }))
      await cache.saveClassroom('kn-after', '2026-04-08', createMockClassroom({ id: 'after' }))

      await cache.clearExpiredCache('2026-04-07')

      const exactResult = await cache.getClassroom('kn-exact', '2026-04-07')
      const afterResult = await cache.getClassroom('kn-after', '2026-04-08')

      expect(exactResult).toBeDefined()
      expect(afterResult).toBeDefined()
    })
  })

  describe('getCacheSize', () => {
    it('should count only renderable classrooms', async () => {
      await cache.saveClassroom('kn-valid', '2026-04-08', createMockClassroom({ id: 'valid-1', title: '数字王国' }))
      await cache.saveClassroom('kn-invalid', '2026-04-08', createMockClassroom({
        id: 'invalid-1',
        title: 'Generated Classroom',
        scenes: [],
      }))

      await expect(cache.getCacheSize()).resolves.toBe(1)
    })
  })

  describe('clearAll', () => {
    it('should remove all cached classrooms', async () => {
      await cache.saveClassroom('kn-1', '2026-04-08', createMockClassroom({ id: 'c1' }))
      await cache.saveClassroom('kn-2', '2026-04-09', createMockClassroom({ id: 'c2' }))

      await cache.clearAll()

      const list = await cache.listCachedClassrooms()
      expect(list).toEqual([])
    })
  })
})
