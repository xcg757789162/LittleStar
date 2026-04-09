/**
 * API 层统一导出
 *
 * 使用方式：
 *   import { apiClient, authApi, ApiError } from '@/services/api'
 */

// PostgREST API Client
export { apiClient } from './client'
export { toSnakeCase, toCamelCase, keysToSnakeCase, keysToCamelCase } from './client'

// Auth Service API Client
export { authApi } from './auth'

// 类型
export {
  ApiError,
  TOKEN_STORAGE_KEY,
  REFRESH_TOKEN_STORAGE_KEY,
  API_REST_BASE,
  API_AUTH_BASE,
} from './types'
export type {
  PostgRESTError,
  AuthError,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  AuthUser,
  PostgRESTOperator,
  PostgRESTFilter,
  PostgRESTOrder,
  PostgRESTQueryOptions,
  PaginatedResponse,
} from './types'
