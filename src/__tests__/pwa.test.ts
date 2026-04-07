import { describe, it, expect } from 'vitest'
import { CacheManager } from '../services/offline/cache-manager'
import { SyncManager } from '../services/offline/sync-manager'

describe('PWA & Offline', () => {
  describe('CacheManager', () => {
    it('应该能创建实例', () => {
      const manager = new CacheManager()
      expect(manager).toBeDefined()
    })

    it('应支持缓存题目', async () => {
      const manager = new CacheManager()
      await manager.cacheQuestions([
        { id: 'q1', question: 'test', answer: '1' },
      ])
      const cached = await manager.getCachedQuestions()
      expect(cached.length).toBe(1)
    })

    it('应支持清除缓存', async () => {
      const manager = new CacheManager()
      await manager.cacheQuestions([
        { id: 'q1', question: 'test', answer: '1' },
      ])
      await manager.clearCache()
      const cached = await manager.getCachedQuestions()
      expect(cached.length).toBe(0)
    })
  })

  describe('SyncManager', () => {
    it('应该能创建实例', () => {
      const manager = new SyncManager()
      expect(manager).toBeDefined()
    })

    it('应支持添加待同步记录', () => {
      const manager = new SyncManager()
      manager.addPendingRecord({ type: 'learning', data: {} })
      expect(manager.getPendingCount()).toBe(1)
    })

    it('应支持清除待同步记录', () => {
      const manager = new SyncManager()
      manager.addPendingRecord({ type: 'learning', data: {} })
      manager.clearPending()
      expect(manager.getPendingCount()).toBe(0)
    })
  })
})
