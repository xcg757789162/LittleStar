/**
 * 离线题目缓存管理器
 */

export interface CachedQuestion {
  id: string
  question: string
  answer: string
}

export class CacheManager {
  private cache: CachedQuestion[] = []

  async cacheQuestions(questions: CachedQuestion[]): Promise<void> {
    this.cache.push(...questions)
  }

  async getCachedQuestions(): Promise<CachedQuestion[]> {
    return [...this.cache]
  }

  async clearCache(): Promise<void> {
    this.cache = []
  }

  getCacheSize(): number {
    return this.cache.length
  }
}
