/**
 * PostgREST API Client
 *
 * 功能：
 * - 自动 Token 注入（Authorization: Bearer <token>）
 * - camelCase ↔ snake_case 自动转换（请求体/响应体）
 * - 401 Token 自动刷新（一次重试）
 * - PostgREST 查询构建（filter、order、select、pagination）
 * - 统一错误处理（ApiError）
 */

import {
  ApiError,
  TOKEN_STORAGE_KEY,
  API_REST_BASE,
  type PostgRESTQueryOptions,
  type PostgRESTFilter,
  type PostgRESTOrder,
  type PaginatedResponse,
} from './types'
import { authApi } from './auth'
import { createLogger } from '@/lib/openmaic/logger'

const log = createLogger('ApiClient')

// ============================================================
// camelCase ↔ snake_case 转换工具
// ============================================================

/** camelCase → snake_case（正确处理连续大写字母如 isAIGenerated → is_ai_generated） */
export function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .replace(/([a-z\d])([A-Z])/g, '$1_$2')
    .toLowerCase()
}

/** snake_case → camelCase */
export function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

/** 递归转换对象键为 snake_case（用于请求体） */
export function keysToSnakeCase<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj
  if (Array.isArray(obj)) return obj.map(keysToSnakeCase) as T
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[toSnakeCase(key)] = keysToSnakeCase(value)
    }
    return result as T
  }
  return obj
}

/** 递归转换对象键为 camelCase（用于响应体） */
export function keysToCamelCase<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj
  if (Array.isArray(obj)) return obj.map(keysToCamelCase) as T
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[toCamelCase(key)] = keysToCamelCase(value)
    }
    return result as T
  }
  return obj
}

// ============================================================
// Token 管理
// ============================================================

function getToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY)
}

function clearToken(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY)
}

// ============================================================
// Token 刷新锁（避免并发刷新）
// ============================================================

let isRefreshing = false
let refreshPromise: Promise<string | null> | null = null

async function refreshTokenIfNeeded(): Promise<string | null> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise
  }

  isRefreshing = true
  refreshPromise = (async () => {
    try {
      const token = getToken()
      if (!token) {
        log.debug('无 token，跳过刷新')
        return null
      }

      log.info('开始刷新 Token...')
      const response = await authApi.refresh(token)
      // 存储刷新后的新 token 到 localStorage
      localStorage.setItem(TOKEN_STORAGE_KEY, response.token)
      log.info('Token 刷新成功')
      return response.token
    } catch (err) {
      // 刷新失败，清除 token
      log.error('Token 刷新失败:', err)
      clearToken()
      return null
    } finally {
      isRefreshing = false
      refreshPromise = null
    }
  })()

  return refreshPromise
}

// ============================================================
// PostgREST 查询参数构建
// ============================================================

function buildFilterParam(filter: PostgRESTFilter): string {
  const col = toSnakeCase(filter.column)
  const { operator, value } = filter

  if (operator === 'in' && Array.isArray(value)) {
    return `${col}=${operator}.(${value.join(',')})`
  }
  if (operator === 'is' && value === null) {
    return `${col}=is.null`
  }
  return `${col}=${operator}.${value}`
}

function buildOrderParam(orders: PostgRESTOrder[]): string {
  return orders
    .map((o) => {
      const col = toSnakeCase(o.column)
      const dir = o.ascending === false ? '.desc' : ''
      const nulls = o.nullsFirst ? '.nullsfirst' : ''
      return `${col}${dir}${nulls}`
    })
    .join(',')
}

function buildQueryString(options?: PostgRESTQueryOptions): string {
  if (!options) return ''

  const params = new URLSearchParams()

  if (options.select) {
    params.set('select', options.select)
  }

  if (options.filters) {
    for (const filter of options.filters) {
      const param = buildFilterParam(filter)
      const [key, val] = param.split('=', 2)
      params.set(key, val)
    }
  }

  if (options.order && options.order.length > 0) {
    params.set('order', buildOrderParam(options.order))
  }

  if (options.offset !== undefined) {
    params.set('offset', String(options.offset))
  }

  if (options.limit !== undefined) {
    params.set('limit', String(options.limit))
  }

  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

// ============================================================
// 核心请求方法
// ============================================================

interface RequestOptions {
  method: string
  path: string
  body?: unknown
  headers?: Record<string, string>
  /** 是否为重试请求（避免循环刷新） */
  isRetry?: boolean
  /** PostgREST 查询选项 */
  query?: PostgRESTQueryOptions
  /** 可选回调：在解析 body 前访问原始 Response（用于读取 headers） */
  onResponse?: (response: Response) => void
}

// ============================================================
// 公共只读表（anon 角色可访问，无需 token）
// ============================================================
const PUBLIC_READONLY_PATHS = new Set([
  '/knowledge_nodes',
  '/questions',
  '/question_templates',
  '/parent_activities',
  '/tpr_instructions',
  '/curricula',
  '/curriculum_modules',
  '/curriculum_nodes',
  '/media_files',
])

/** 判断路径是否是公共只读表 */
function isPublicPath(path: string): boolean {
  // 精确匹配或带查询参数（如 /curricula?subject=eq.math）
  return PUBLIC_READONLY_PATHS.has(path) ||
    [...PUBLIC_READONLY_PATHS].some((p) => path.startsWith(`${p}?`))
}

async function request<T>(options: RequestOptions): Promise<T> {
  const { method, path, body, headers = {}, isRetry = false, query, onResponse } = options

  const token = getToken()
  const url = `${API_REST_BASE}${path}${buildQueryString(query)}`

  // ── Token 守卫：无 token + 非公共表 → 直接拒绝，不发请求 ──
  // 这避免了 PostgREST 用 anon 角色访问私有表导致 "permission denied"
  if (!token && !isPublicPath(path)) {
    log.warn('无 token 访问非公共路径，拒绝:', method, path)
    throw new ApiError(401, '请先登录后再操作')
  }

  // 写操作必须有 token（即使是公共表也不允许匿名写入）
  if (!token && method !== 'GET') {
    log.warn('无 token 尝试写操作，拒绝:', method, path)
    throw new ApiError(401, '请先登录后再操作')
  }

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  }

  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`
  }

  // PostgREST: Prefer header（合并自定义 Prefer 而非覆盖）
  const preferParts: string[] = []
  if (headers?.['Prefer']) {
    preferParts.push(headers['Prefer'])
  }
  if (method === 'POST' && !preferParts.some(p => p.includes('return='))) {
    preferParts.push('return=representation')
  }
  if ((method === 'PATCH' || method === 'PUT') && !preferParts.some(p => p.includes('return='))) {
    preferParts.push('return=representation')
  }
  if (query?.count) {
    preferParts.push('count=exact')
  }
  if (preferParts.length > 0) {
    requestHeaders['Prefer'] = preferParts.join(', ')
  }

  // 8 秒超时保底，避免后端不可达时无限等待
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)
  const startTime = Date.now()

  log.debug(`→ ${method} ${path}${isRetry ? ' (retry)' : ''}`)

  let response: Response
  try {
    response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(keysToSnakeCase(body)) : undefined,
      signal: controller.signal,
    })
  } catch (error) {
    clearTimeout(timeout)
    const elapsed = Date.now() - startTime
    if (error instanceof DOMException && error.name === 'AbortError') {
      log.error(`✗ ${method} ${path} 超时 (${elapsed}ms)`)
      throw new ApiError(0, '连接超时，请检查后端服务是否正在运行')
    }
    log.error(`✗ ${method} ${path} 网络错误 (${elapsed}ms):`, error)
    throw error
  } finally {
    clearTimeout(timeout)
  }

  const elapsed = Date.now() - startTime

  // 401 处理：尝试刷新 Token
  if (response.status === 401 && !isRetry) {
    log.warn(`← ${method} ${path} 401 (${elapsed}ms)，尝试刷新 Token...`)
    const newToken = await refreshTokenIfNeeded()
    if (newToken) {
      // 用新 token 重试
      return request<T>({ ...options, isRetry: true })
    }
    // 刷新失败 — 触发登出（由调用方通过 onError 处理）
    throw new ApiError(401, '认证已过期，请重新登录')
  }

  // 错误处理
  if (!response.ok) {
    let errorMessage = `请求失败 (${response.status})`
    let errorDetails: unknown
    let errorCode: string | undefined

    try {
      const errorBody = await response.json()
      // PostgREST 错误格式
      if (errorBody.message) {
        errorMessage = errorBody.message
        errorDetails = errorBody.details || errorBody.hint
        errorCode = errorBody.code
      }
    } catch (parseErr) {
      // 无法解析错误响应体，使用默认消息
      log.debug('错误响应体解析失败:', parseErr)
    }

    // 403 权限错误：给出更清晰的提示，而不是让用户以为服务离线
    if (response.status === 403) {
      errorMessage = '权限不足，请确认已登录且有权访问此数据'
    }

    log.error(`← ${method} ${path} ${response.status} (${elapsed}ms):`, errorMessage, errorDetails ?? '')
    throw new ApiError(response.status, errorMessage, errorDetails, errorCode)
  }

  // 回调：在解析 body 前让调用方访问 response headers
  if (onResponse) {
    onResponse(response)
  }

  // 204 No Content
  if (response.status === 204) {
    log.debug(`← ${method} ${path} 204 (${elapsed}ms)`)
    return undefined as T
  }

  // 解析响应
  const text = await response.text()
  if (!text) {
    log.debug(`← ${method} ${path} empty (${elapsed}ms)`)
    return undefined as T
  }

  log.debug(`← ${method} ${path} ${response.status} (${elapsed}ms)`)
  const data = JSON.parse(text)
  return keysToCamelCase(data) as T
}

// ============================================================
// 公开 API 方法
// ============================================================

/**
 * PostgREST API Client
 *
 * 所有方法自动处理：
 * - Token 注入
 * - camelCase ↔ snake_case 转换
 * - 401 Token 刷新
 * - 错误处理
 */
export const apiClient = {
  /**
   * GET 请求 — 查询数据列表
   * @param path - PostgREST 资源路径（如 '/children'）
   * @param options - 查询选项（filter、order、select、pagination）
   */
  async get<T>(path: string, options?: PostgRESTQueryOptions): Promise<T[]> {
    return request<T[]>({
      method: 'GET',
      path,
      query: options,
    })
  },

  /**
   * GET 请求 — 查询单条数据
   * 自动添加 Accept: application/vnd.pgrst.object+json header
   * @param path - PostgREST 资源路径（如 '/children'）
   * @param options - 查询选项（必须包含唯一过滤条件）
   */
  async getOne<T>(path: string, options?: PostgRESTQueryOptions): Promise<T | null> {
    try {
      return await request<T>({
        method: 'GET',
        path,
        query: { ...options, limit: 1 },
        headers: {
          Accept: 'application/vnd.pgrst.object+json',
        },
      })
    } catch (error) {
      // PostgREST 在找不到数据时返回 406
      if (error instanceof ApiError && error.status === 406) {
        return null
      }
      throw error
    }
  },

  /**
   * GET 请求 — 分页查询（带总数）
   * 使用 Prefer: count=exact 并解析 Content-Range header 获取总数
   */
  async getPaginated<T>(
    path: string,
    options?: PostgRESTQueryOptions,
  ): Promise<PaginatedResponse<T>> {
    let count: number | null = null

    const data = await request<T[]>({
      method: 'GET',
      path,
      query: { ...options, count: true },
      onResponse: (response) => {
        const contentRange = response.headers.get('Content-Range')
        if (contentRange) {
          const match = contentRange.match(/\/(\d+|\*)/)
          if (match && match[1] !== '*') {
            count = parseInt(match[1], 10)
          }
        }
      },
    })

    return { data, count }
  },

  /**
   * POST 请求 — 创建数据
   * 自动添加 Prefer: return=representation 获取创建后的数据
   * @param path - PostgREST 资源路径
   * @param body - 请求体（camelCase，自动转换为 snake_case）
   */
  async post<T>(path: string, body: unknown): Promise<T> {
    const result = await request<T[]>({
      method: 'POST',
      path,
      body,
    })
    // PostgREST POST with return=representation 返回数组
    return Array.isArray(result) ? result[0] : result
  },

  /**
   * PATCH 请求 — 更新数据
   * @param path - PostgREST 资源路径（需包含过滤条件，如 '/children?id=eq.1'）
   * @param body - 更新字段（camelCase，自动转换为 snake_case）
   * @param options - 查询选项（过滤条件）
   */
  async patch<T>(path: string, body: unknown, options?: PostgRESTQueryOptions): Promise<T> {
    const result = await request<T[]>({
      method: 'PATCH',
      path,
      body,
      query: options,
    })
    return Array.isArray(result) ? result[0] : result
  },

  /**
   * DELETE 请求 — 删除数据
   * @param path - PostgREST 资源路径
   * @param options - 查询选项（过滤条件）
   */
  async delete(path: string, options?: PostgRESTQueryOptions): Promise<void> {
    await request<void>({
      method: 'DELETE',
      path,
      query: options,
    })
  },

  /**
   * RPC 调用 — 调用 PostgreSQL 函数
   * @param funcName - 函数名（snake_case）
   * @param args - 函数参数
   */
  async rpc<T>(funcName: string, args?: Record<string, unknown>): Promise<T> {
    return request<T>({
      method: 'POST',
      path: `/rpc/${funcName}`,
      body: args,
    })
  },

  /**
   * Upsert 单条数据（POST + Prefer: resolution=merge-duplicates）
   *
   * 利用 PostgREST 的 upsert 语义：当 UNIQUE 约束冲突时更新，否则插入。
   * @param path - PostgREST 资源路径（如 '/mastery_records'）
   * @param body - 请求体（camelCase，自动转换为 snake_case）
   * @param onConflict - 冲突列（snake_case，逗号分隔）。PostgREST 在表有多个 UNIQUE
   *   约束时需要显式指定用于冲突检测的列，例如 'child_id,knowledge_node_id'
   */
  async upsert<T>(path: string, body: unknown, onConflict?: string): Promise<T> {
    const upsertPath = onConflict ? `${path}?on_conflict=${onConflict}` : path
    const result = await request<T[]>({
      method: 'POST',
      path: upsertPath,
      body,
      headers: {
        Prefer: 'resolution=merge-duplicates',
      },
    })
    return Array.isArray(result) ? result[0] : result
  },

  /**
   * Upsert 批量数据（POST 数组 + Prefer: resolution=merge-duplicates）
   *
   * 与 upsert 相同，但接受数组输入。
   * @param path - PostgREST 资源路径
   * @param bodies - 请求体数组（camelCase，自动转换为 snake_case）
   * @param onConflict - 冲突列（snake_case，逗号分隔）
   */
  async batchUpsert<T>(path: string, bodies: unknown[], onConflict?: string): Promise<T[]> {
    const upsertPath = onConflict ? `${path}?on_conflict=${onConflict}` : path
    return request<T[]>({
      method: 'POST',
      path: upsertPath,
      body: bodies,
      headers: {
        Prefer: 'resolution=merge-duplicates',
      },
    })
  },
}
