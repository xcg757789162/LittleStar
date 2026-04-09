/**
 * 媒体文件 URL 解析工具
 *
 * 对课堂中的 imageUrl/audioUrl 进行解析：
 * - 如果已经是本地路径（/media/...），直接返回
 * - 如果是外部 URL，返回原始 URL（后续服务器端下载后会替换为本地路径）
 *
 * 降级策略：数据库放不了的大文件（图片/音频/视频），
 * 下载到服务器文件系统 /data/media/ 目录，通过 Nginx 静态服务。
 */

/**
 * 解析媒体 URL
 *
 * @param url - 原始 URL（可能是外部 URL 或本地路径）
 * @returns 最终可用的 URL，undefined 时返回 undefined
 *
 * @example
 * ```ts
 * resolveMediaUrl('/media/abc123.jpg')  // → '/media/abc123.jpg'
 * resolveMediaUrl('https://cdn.example.com/img.jpg')  // → 'https://cdn.example.com/img.jpg'
 * resolveMediaUrl(undefined)  // → undefined
 * ```
 */
export function resolveMediaUrl(url: string | undefined): string | undefined {
  if (!url) return undefined

  // 已是本地媒体路径
  if (url.startsWith('/media/')) return url

  // 相对路径（可能是 OpenMAIC 生成的）
  if (url.startsWith('/openmaic/')) return url

  // 外部 URL 直接返回（后续服务器端异步下载后数据库会更新为本地路径）
  return url
}

/**
 * 批量解析课堂 JSON 中的所有媒体 URL
 * 扫描 Classroom 中所有 slides 的 imageUrl 和 audioUrl
 *
 * @param classroomData - 课堂 JSON 数据
 * @returns 所有媒体 URL 列表（去重）
 */
export function extractMediaUrls(classroomData: Record<string, unknown>): string[] {
  const urls = new Set<string>()

  function walk(obj: unknown): void {
    if (obj === null || obj === undefined) return
    if (typeof obj === 'string') return
    if (Array.isArray(obj)) {
      for (const item of obj) walk(item)
      return
    }
    if (typeof obj === 'object') {
      const record = obj as Record<string, unknown>
      // 提取 imageUrl 和 audioUrl
      if (typeof record.imageUrl === 'string' && record.imageUrl) {
        urls.add(record.imageUrl)
      }
      if (typeof record.audioUrl === 'string' && record.audioUrl) {
        urls.add(record.audioUrl)
      }
      // 递归遍历
      for (const value of Object.values(record)) {
        walk(value)
      }
    }
  }

  walk(classroomData)
  return Array.from(urls)
}
