/**
 * Auth Service API Client
 *
 * 封装认证服务的 4 个端点：
 * - POST /api/auth/register — 注册
 * - POST /api/auth/login — 登录
 * - POST /api/auth/refresh — 刷新 Token
 * - GET  /api/auth/me — 获取当前用户信息
 *
 * 注意：Auth API 不经过 PostgREST，直接访问 Auth Service。
 * Auth Service 返回的是 camelCase（Node.js 习惯），所以不需要做 snake_case 转换。
 * 但为了一致性，我们仍然使用 keysToCamelCase 处理响应。
 */

import {
  ApiError,
  API_AUTH_BASE,
  TOKEN_STORAGE_KEY,
  type LoginRequest,
  type RegisterRequest,
  type AuthResponse,
  type AuthUser,
} from './types'
import { keysToCamelCase } from './client'

// ============================================================
// 内部请求方法（Auth Service 专用）
// ============================================================

async function authRequest<T>(
  method: string,
  path: string,
  options?: {
    body?: unknown
    token?: string
  },
): Promise<T> {
  const url = `${API_AUTH_BASE}${path}`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (options?.token) {
    headers['Authorization'] = `Bearer ${options.token}`
  }

  // 5 秒超时保底，避免后端不可达时无限等待
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)

  let response: Response
  try {
    response = await fetch(url, {
      method,
      headers,
      body: options?.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    })
  } catch (error) {
    clearTimeout(timeout)
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError(0, '连接超时，请检查后端服务是否正在运行')
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }

  // 错误处理
  if (!response.ok) {
    let errorMessage = `认证请求失败 (${response.status})`
    let errorDetails: unknown

    try {
      const errorBody = await response.json()
      if (errorBody.message) {
        errorMessage = errorBody.message
      }
      errorDetails = errorBody.details || errorBody.error
    } catch {
      // 无法解析错误体
    }

    throw new ApiError(response.status, errorMessage, errorDetails)
  }

  const data = await response.json()
  return keysToCamelCase(data) as T
}

// ============================================================
// Auth API
// ============================================================

/**
 * Auth Service API Client
 *
 * 所有方法直接与 Auth Service 通信（通过 Nginx 代理）。
 * Token 管理由调用方（authStore）负责。
 */
export const authApi = {
  /**
   * 用户注册
   * @returns JWT token + 用户信息
   */
  async register(data: RegisterRequest): Promise<AuthResponse> {
    return authRequest<AuthResponse>('POST', '/register', { body: data })
  },

  /**
   * 用户登录
   * @returns JWT token + 用户信息
   */
  async login(data: LoginRequest): Promise<AuthResponse> {
    return authRequest<AuthResponse>('POST', '/login', { body: data })
  },

  /**
   * 刷新 Token
   * @param currentToken - 当前的 JWT token
   * @returns 新的 JWT token + 用户信息
   */
  async refresh(currentToken: string): Promise<AuthResponse> {
    return authRequest<AuthResponse>('POST', '/refresh', {
      token: currentToken,
    })
  },

  /**
   * 获取当前用户信息
   * @returns 用户信息（不含密码）
   */
  async me(): Promise<AuthUser> {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY)
    if (!token) {
      throw new ApiError(401, '未登录')
    }
    return authRequest<AuthUser>('GET', '/me', { token })
  },
}
