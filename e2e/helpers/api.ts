import type { APIRequestContext, APIResponse } from '@playwright/test'
import type { E2EEnv } from '../config/env'
import type {
  AuthResponse,
  PostgRESTFilter,
  PostgRESTOrder,
  PostgRESTQueryOptions,
} from '../../src/services/api/types'

interface RequestConfig {
  token?: string
  body?: unknown
  headers?: Record<string, string>
  query?: PostgRESTQueryOptions
}

export class E2EApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: string,
  ) {
    super(message)
    this.name = 'E2EApiError'
  }
}

function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .replace(/([a-z\d])([A-Z])/g, '$1_$2')
    .toLowerCase()
}

function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())
}

function keysToSnakeCase<T>(value: T): T {
  if (value === null || value === undefined) return value
  if (Array.isArray(value)) {
    return value.map((item) => keysToSnakeCase(item)) as T
  }
  if (typeof value === 'object' && !(value instanceof Date)) {
    const result: Record<string, unknown> = {}
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      result[toSnakeCase(key)] = keysToSnakeCase(entry)
    }
    return result as T
  }
  return value
}

function keysToCamelCase<T>(value: T): T {
  if (value === null || value === undefined) return value
  if (Array.isArray(value)) {
    return value.map((item) => keysToCamelCase(item)) as T
  }
  if (typeof value === 'object' && !(value instanceof Date)) {
    const result: Record<string, unknown> = {}
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      result[toCamelCase(key)] = keysToCamelCase(entry)
    }
    return result as T
  }
  return value
}

function splitPathSegments(path: string): string[] {
  return path
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean)
}

function joinUrl(baseUrl: string, path: string): URL {
  const url = new URL(baseUrl)
  const joinedPath = [...splitPathSegments(url.pathname), ...splitPathSegments(path)].join('/')
  url.pathname = `/${joinedPath}`
  return url
}

function buildFilterValue(filter: PostgRESTFilter): string {
  if (filter.operator === 'in' && Array.isArray(filter.value)) {
    return `in.(${filter.value.join(',')})`
  }
  if (filter.operator === 'is' && filter.value === null) {
    return 'is.null'
  }
  return `${filter.operator}.${String(filter.value)}`
}

function buildOrderValue(orders: PostgRESTOrder[]): string {
  return orders
    .map((order) => {
      const direction = order.ascending === false ? '.desc' : ''
      const nullsFirst = order.nullsFirst ? '.nullsfirst' : ''
      return `${toSnakeCase(order.column)}${direction}${nullsFirst}`
    })
    .join(',')
}

function appendQuery(url: URL, query?: PostgRESTQueryOptions) {
  if (!query) return

  if (query.select) {
    url.searchParams.set('select', query.select)
  }

  if (query.filters) {
    for (const filter of query.filters) {
      url.searchParams.set(toSnakeCase(filter.column), buildFilterValue(filter))
    }
  }

  if (query.order?.length) {
    url.searchParams.set('order', buildOrderValue(query.order))
  }

  if (query.limit !== undefined) {
    url.searchParams.set('limit', String(query.limit))
  }

  if (query.offset !== undefined) {
    url.searchParams.set('offset', String(query.offset))
  }
}

async function parseJson<T>(response: APIResponse): Promise<T> {
  const text = await response.text()
  if (!text) {
    return undefined as T
  }
  return keysToCamelCase(JSON.parse(text)) as T
}

async function ensureOk(response: APIResponse, url: string) {
  if (response.ok()) {
    return
  }

  let details = ''
  try {
    details = await response.text()
  } catch {
    details = ''
  }

  throw new E2EApiError(
    response.status(),
    `请求失败: ${response.status()} ${url}`,
    details,
  )
}

async function requestJson<T>(
  request: APIRequestContext,
  method: string,
  url: URL,
  { token, body, headers = {} }: RequestConfig = {},
): Promise<T> {
  const response = await request.fetch(url.toString(), {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    data: body === undefined ? undefined : keysToSnakeCase(body),
  })

  await ensureOk(response, url.toString())
  return parseJson<T>(response)
}

export async function authLogin(
  request: APIRequestContext,
  env: E2EEnv,
  credentials: { username: string; password: string },
): Promise<AuthResponse> {
  const url = joinUrl(env.authApiURL, '/login')
  return requestJson<AuthResponse>(request, 'POST', url, {
    body: credentials,
  })
}

export async function authRegister(
  request: APIRequestContext,
  env: E2EEnv,
  credentials: { username: string; password: string; nickname: string },
): Promise<AuthResponse> {
  const url = joinUrl(env.authApiURL, '/register')
  return requestJson<AuthResponse>(request, 'POST', url, {
    body: credentials,
  })
}

export async function restGet<T>(
  request: APIRequestContext,
  env: E2EEnv,
  token: string,
  path: string,
  query?: PostgRESTQueryOptions,
): Promise<T[]> {
  const url = joinUrl(env.restApiURL, path)
  appendQuery(url, query)
  return requestJson<T[]>(request, 'GET', url, { token })
}

export async function restGetOne<T>(
  request: APIRequestContext,
  env: E2EEnv,
  token: string,
  path: string,
  query?: PostgRESTQueryOptions,
): Promise<T | null> {
  const rows = await restGet<T>(request, env, token, path, {
    ...query,
    limit: 1,
  })
  return rows[0] ?? null
}

export async function restPost<T>(
  request: APIRequestContext,
  env: E2EEnv,
  token: string,
  path: string,
  body: unknown,
): Promise<T> {
  const url = joinUrl(env.restApiURL, path)
  const result = await requestJson<T | T[]>(request, 'POST', url, {
    token,
    body,
    headers: {
      Prefer: 'return=representation',
    },
  })

  return Array.isArray(result) ? result[0] : result
}
