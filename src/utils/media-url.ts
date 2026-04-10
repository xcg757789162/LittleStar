/**
 * 媒体文件 URL 解析工具
 *
 * 对课堂中的 imageUrl/audioUrl 进行解析：
 * - 如果是 OpenMAIC 的 gen_img_/gen_vid_ 占位符，返回 undefined（触发兜底）
 * - 如果已经是本地路径（/media/...），直接返回
 * - 如果是外部 URL，返回原始 URL
 */

/** 检测 OpenMAIC 媒体占位符 ID（gen_img_XXXX / gen_vid_XXXX） */
const MEDIA_PLACEHOLDER_RE = /^gen_(img|vid)_[A-Za-z0-9_-]+$/

/**
 * 判断 URL 是否是 OpenMAIC 的媒体占位符
 *
 * OpenMAIC 后端生成课堂 JSON 时，给图片/视频元素分配 gen_img_XXXX / gen_vid_XXXX
 * 占位符 ID。这些不是可访问的 URL，需要 OpenMAIC 前端在浏览器端异步调用 AI API
 * 生成实际的媒体内容。
 *
 * @param url - 待检测的 URL 字符串
 * @returns 是否是占位符 ID
 */
export function isMediaPlaceholder(url: string | undefined): boolean {
  if (!url) return false
  return MEDIA_PLACEHOLDER_RE.test(url)
}

/**
 * 解析媒体 URL
 *
 * @param url - 原始 URL（可能是外部 URL、本地路径或 OpenMAIC 占位符）
 * @returns 最终可用的 URL；占位符和空值返回 undefined
 *
 * @example
 * ```ts
 * resolveMediaUrl('/media/abc123.jpg')          // → '/media/abc123.jpg'
 * resolveMediaUrl('https://cdn.example.com/x')  // → 'https://cdn.example.com/x'
 * resolveMediaUrl('gen_img_kNgXUREJ')           // → undefined（占位符）
 * resolveMediaUrl(undefined)                     // → undefined
 * ```
 */
export function resolveMediaUrl(url: string | undefined): string | undefined {
  if (!url) return undefined

  // OpenMAIC 占位符 ID → 不是可访问的 URL
  if (isMediaPlaceholder(url)) return undefined

  // 已是本地媒体路径
  if (url.startsWith('/media/')) return url

  // 相对路径（可能是 OpenMAIC 生成的）
  if (url.startsWith('/openmaic/')) return url

  // 外部 URL 直接返回
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
