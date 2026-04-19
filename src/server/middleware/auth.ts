/**
 * Auth Middleware — JWT 验证（HS256）
 *
 * 复用 auth-service 发的 token（JWT_SECRET 相同）。
 * 为避免新增 npm 依赖，直接用 Node 内置 crypto 校验 HS256 签名。
 *
 * 用法：
 *   app.post('/api/courses/...', requireAuth, (req, res) => {
 *     const userId = req.authUser!.userId   // 从 token 解出来的用户 id（number）
 *   })
 */

import type { Request, Response, NextFunction } from 'express'
import { createHmac, timingSafeEqual } from 'crypto'

export interface AuthUser {
  userId: number
  username?: string
  role?: string
}

declare module 'express-serve-static-core' {
  interface Request {
    authUser?: AuthUser
  }
}

function b64urlDecode(input: string): Buffer {
  // base64url → base64
  const padded = input.replace(/-/g, '+').replace(/_/g, '/') +
    '='.repeat((4 - (input.length % 4)) % 4)
  return Buffer.from(padded, 'base64')
}

function verifyHS256(token: string, secret: string): Record<string, unknown> | null {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [headerB64, payloadB64, sigB64] = parts

  let header: { alg?: string; typ?: string }
  try {
    header = JSON.parse(b64urlDecode(headerB64).toString('utf8'))
  } catch {
    return null
  }
  if (header.alg !== 'HS256') return null

  const signingInput = `${headerB64}.${payloadB64}`
  const expected = createHmac('sha256', secret).update(signingInput).digest()
  const actual = b64urlDecode(sigB64)

  if (expected.length !== actual.length) return null
  if (!timingSafeEqual(expected, actual)) return null

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(b64urlDecode(payloadB64).toString('utf8'))
  } catch {
    return null
  }

  // 过期校验
  const exp = payload.exp
  if (typeof exp === 'number' && exp * 1000 < Date.now()) return null

  return payload
}

function extractToken(req: Request): string | null {
  const header = req.headers.authorization
  if (!header) return null
  if (!header.startsWith('Bearer ')) return null
  return header.slice(7).trim() || null
}

function parseUserIdFromPayload(payload: Record<string, unknown>): number | null {
  // auth-service 里 user_id 是 string，兼容一下
  const raw = payload.user_id ?? payload.sub ?? payload.userId
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw
  if (typeof raw === 'string') {
    const n = parseInt(raw, 10)
    if (Number.isFinite(n)) return n
  }
  return null
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    console.error('[auth] JWT_SECRET env not set — refusing all requests')
    res.status(500).json({ error: 'server JWT_SECRET not configured' })
    return
  }

  const token = extractToken(req)
  if (!token) {
    res.status(401).json({ error: '缺少 Authorization Bearer token' })
    return
  }

  const payload = verifyHS256(token, secret)
  if (!payload) {
    res.status(401).json({ error: 'token 无效或已过期' })
    return
  }

  const userId = parseUserIdFromPayload(payload)
  if (userId === null) {
    res.status(401).json({ error: 'token 中没有 user_id' })
    return
  }

  req.authUser = {
    userId,
    username: typeof payload.username === 'string' ? payload.username : undefined,
    role: typeof payload.role === 'string' ? payload.role : undefined,
  }
  next()
}
