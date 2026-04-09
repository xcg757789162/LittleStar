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

// ============================================================
// camelCase ↔ snake_case 转换工具
// ============================================================

/** camelCase → snake_case */
export function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
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
      if (!token) return null

      const response = await authApi.refresh(token)
      return response.token
    } catch {
      // 刷新失败，清除 token
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
}

async function request<T>(options: RequestOptions): Promise<T> {
  const { method, path, body, headers = {}, isRetry = false, query } = options

  const token = getToken()
  const url = `${API_REST_BASE}${path}${buildQueryString(query)}`

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  }

  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`
  }

  // PostgREST: Prefer header
  const preferParts: string[] = []
  if (method === 'POST') {
    preferParts.push('return=representation')
  }
  if (method === 'PATCH' || method === 'PUT') {
    preferParts.push('return=representation')
  }
  if (query?.count) {
    preferParts.push('count=exact')
  }
  if (preferParts.length > 0) {
    requestHeaders['Prefer'] = preferParts.join(', ')
  }

  const response = await fetch(url, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(keysToSnakeCase(body)) : undefined,
  })

  // 401 处理：尝试刷新 Token
  if (response.status === 401 && !isRetry) {
    const newToken = await refreshTokenIfNeeded()
    if (newToken) {
      // 用新 token 重试
      return request<T>({ ...options, isRetry: true })
    }
    // 刷新失败 — 触发登出（由调用方通过 onError 处理）
    throw new ApiError(401, '认证已过期，请重新登录')
  }

  // 204 No Content
  if (response.status === 204) {
    return undefined as T
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
    } catch {
      // 无法解析错误响应体，使用默认消息
    }

    throw new ApiError(response.status, errorMessage, errorDetails, errorCode)
  }

  // 解析响应
  const text = await response.text()
  if (!text) return undefined as T

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
   */
  async getPaginated<T>(
    path: string,
    options?: PostgRESTQueryOptions,
  ): Promise<PaginatedResponse<T>> {
    const queryOptions = { ...options, count: true }
    const token = getToken()
    const url = `${API_REST_BASE}${path}${buildQueryString(queryOptions)}`

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      Prefer: 'count=exact',
    }
    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: requestHeaders,
    })

    if (!response.ok) {
      let errorMessage = `请求失败 (${response.status})`
      try {
        const errorBody = await response.json()
        if (errorBody.message) errorMessage = errorBody.message
      } catch {
        // ignore
      }
      throw new ApiError(response.status, errorMessage)
    }

    const data = await response.json()
    const contentRange = response.headers.get('Content-Range')
    let count: number | null = null
    if (contentRange) {
      const match = contentRange.match(/\/(\d+|\*)/)
      if (match && match[1] !== '*') {
        count = parseInt(match[1], 10)
      }
    }

    return {
      data: keysToCamelCase(data) as T[],
      count,
    }
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
}
