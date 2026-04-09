/**
 * API 层类型定义
 * 定义请求/响应、错误、分页等通用类型
 */

// ============================================================
// 通用 API 错误
// ============================================================

/** PostgREST 标准错误响应 */
export interface PostgRESTError {
  hint: string | null
  details: string | null
  code: string
  message: string
}

/** Auth Service 错误响应 */
export interface AuthError {
  error: string
  message: string
  details?: unknown
}

/** 统一 API 错误对象 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
    public readonly code?: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }

  /** 是否为认证错误（401） */
  get isUnauthorized(): boolean {
    return this.status === 401
  }

  /** 是否为权限错误（403） */
  get isForbidden(): boolean {
    return this.status === 403
  }

  /** 是否为未找到（404） */
  get isNotFound(): boolean {
    return this.status === 404
  }

  /** 是否为冲突（409，如唯一约束违反） */
  get isConflict(): boolean {
    return this.status === 409
  }
}

// ============================================================
// Auth 相关类型
// ============================================================

/** 登录请求 */
export interface LoginRequest {
  username: string
  password: string
}

/** 注册请求 */
export interface RegisterRequest {
  username: string
  password: string
  nickname: string
}

/** Auth 响应（登录/注册/刷新） */
export interface AuthResponse {
  token: string
  user: AuthUser
}

/** JWT 中的用户信息 */
export interface AuthUser {
  id: number
  username: string
  nickname: string
  createdAt: string
  lastLoginAt: string | null
}

// ============================================================
// PostgREST 查询参数
// ============================================================

/** PostgREST 操作符 */
export type PostgRESTOperator =
  | 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte'
  | 'like' | 'ilike' | 'in' | 'is'
  | 'cs' | 'cd' | 'ov' // 数组操作符

/** PostgREST 查询过滤器 */
export interface PostgRESTFilter {
  column: string
  operator: PostgRESTOperator
  value: string | number | boolean | null | (string | number)[]
}

/** PostgREST 排序 */
export interface PostgRESTOrder {
  column: string
  ascending?: boolean
  nullsFirst?: boolean
}

/** PostgREST 查询选项 */
export interface PostgRESTQueryOptions {
  /** 选择的列（PostgREST select 语法） */
  select?: string
  /** 过滤条件 */
  filters?: PostgRESTFilter[]
  /** 排序 */
  order?: PostgRESTOrder[]
  /** 偏移量（分页） */
  offset?: number
  /** 限制数量（分页） */
  limit?: number
  /** 是否返回总数（Prefer: count=exact） */
  count?: boolean
}

/** 分页响应 */
export interface PaginatedResponse<T> {
  data: T[]
  count: number | null
}

// ============================================================
// Token 管理
// ============================================================

/** JWT Token 存储键名 */
export const TOKEN_STORAGE_KEY = 'littlestar_jwt_token'

// ============================================================
// API 基础路径
// ============================================================

/** PostgREST API 基础路径 */
export const API_REST_BASE = '/api/rest'

/** Auth Service API 基础路径 */
export const API_AUTH_BASE = '/api/auth'
