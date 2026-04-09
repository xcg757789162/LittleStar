import express, { Request, Response, NextFunction } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { Pool } from 'pg'

// ============================================================
// 配置
// ============================================================
const PORT = parseInt(process.env.AUTH_PORT || '3001', 10)
const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  console.error('[Auth Service] FATAL: JWT_SECRET environment variable is required')
  process.exit(1)
}
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'
const BCRYPT_ROUNDS = 10

const DATABASE_URL = process.env.DATABASE_URL ||
  `postgresql://${process.env.POSTGRES_USER || 'postgres'}:${process.env.POSTGRES_PASSWORD || 'postgres'}@${process.env.POSTGRES_HOST || 'postgres'}:${process.env.POSTGRES_PORT || '5432'}/${process.env.POSTGRES_DB || 'littlestar'}`

// ============================================================
// 数据库连接池
// ============================================================
const pool = new Pool({ connectionString: DATABASE_URL })

// ============================================================
// 自定义错误类
// ============================================================
class AppError extends Error {
  constructor(
    public statusCode: number,
    public error: string,
    message: string,
    public details?: unknown
  ) {
    super(message)
    this.name = 'AppError'
  }
}

// ============================================================
// JWT 工具函数
// ============================================================
interface JWTPayload {
  role: string
  user_id: string
  username: string
}

function signToken(payload: JWTPayload): string {
  return jwt.sign(
    { ...payload },
    JWT_SECRET!,
    { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
  )
}

function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, JWT_SECRET!) as unknown as JWTPayload
}

function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7)
  }
  return null
}

// ============================================================
// 输入验证
// ============================================================
function validateRegisterInput(body: Record<string, unknown>): { username: string; password: string; nickname: string } {
  const { username, password, nickname } = body as { username?: string; password?: string; nickname?: string }

  if (!username || typeof username !== 'string') {
    throw new AppError(400, 'validation_error', '用户名不能为空')
  }
  if (username.length < 3 || username.length > 50) {
    throw new AppError(400, 'validation_error', '用户名长度必须在 3-50 之间')
  }
  if (!password || typeof password !== 'string') {
    throw new AppError(400, 'validation_error', '密码不能为空')
  }
  if (password.length < 6) {
    throw new AppError(400, 'validation_error', '密码长度不能少于 6 位')
  }
  if (!nickname || typeof nickname !== 'string') {
    throw new AppError(400, 'validation_error', '昵称不能为空')
  }

  return { username: username.trim(), password, nickname: nickname.trim() }
}

function validateLoginInput(body: Record<string, unknown>): { username: string; password: string } {
  const { username, password } = body as { username?: string; password?: string }

  if (!username || typeof username !== 'string') {
    throw new AppError(400, 'validation_error', '用户名不能为空')
  }
  if (!password || typeof password !== 'string') {
    throw new AppError(400, 'validation_error', '密码不能为空')
  }

  return { username: username.trim(), password }
}

// ============================================================
// Express App
// ============================================================
const app = express()
app.use(express.json())

// 健康检查
app.get('/auth/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'auth-service' })
})

// ============================================================
// POST /auth/register — 用户注册
// ============================================================
app.post('/auth/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password, nickname } = validateRegisterInput(req.body)

    // 检查用户名是否已存在
    const existingUser = await pool.query(
      'SELECT id FROM api.users WHERE username = $1',
      [username]
    )
    if (existingUser.rows.length > 0) {
      throw new AppError(409, 'conflict', '用户名已被占用')
    }

    // bcrypt 哈希密码
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)

    // 插入用户
    const result = await pool.query(
      'INSERT INTO api.users (username, password_hash, nickname) VALUES ($1, $2, $3) RETURNING id, username, nickname, created_at',
      [username, passwordHash, nickname]
    )
    const user = result.rows[0]

    // 签发 JWT
    const token = signToken({
      role: 'authenticated',
      user_id: String(user.id),
      username: user.username,
    })

    res.status(201).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        createdAt: user.created_at,
      },
    })
  } catch (err) {
    next(err)
  }
})

// ============================================================
// POST /auth/login — 用户登录
// ============================================================
app.post('/auth/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password } = validateLoginInput(req.body)

    // 查询用户
    const result = await pool.query(
      'SELECT id, username, nickname, password_hash, created_at FROM api.users WHERE username = $1',
      [username]
    )
    if (result.rows.length === 0) {
      throw new AppError(401, 'unauthorized', '用户名或密码错误')
    }
    const user = result.rows[0]

    // 验证密码
    const isMatch = await bcrypt.compare(password, user.password_hash)
    if (!isMatch) {
      throw new AppError(401, 'unauthorized', '用户名或密码错误')
    }

    // 更新 last_login_at
    await pool.query(
      'UPDATE api.users SET last_login_at = NOW() WHERE id = $1',
      [user.id]
    )

    // 签发 JWT
    const token = signToken({
      role: 'authenticated',
      user_id: String(user.id),
      username: user.username,
    })

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        createdAt: user.created_at,
      },
    })
  } catch (err) {
    next(err)
  }
})

// ============================================================
// POST /auth/refresh — Token 刷新
// ============================================================
app.post('/auth/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = extractToken(req)
    if (!token) {
      throw new AppError(401, 'unauthorized', '缺少 Authorization token')
    }

    // 验证旧 token
    let payload: JWTPayload
    try {
      payload = verifyToken(token)
    } catch {
      throw new AppError(401, 'unauthorized', 'Token 无效或已过期')
    }

    // 确认用户仍然存在
    const result = await pool.query(
      'SELECT id, username, nickname FROM api.users WHERE id = $1',
      [parseInt(payload.user_id, 10)]
    )
    if (result.rows.length === 0) {
      throw new AppError(401, 'unauthorized', '用户不存在')
    }

    // 签发新 token
    const newToken = signToken({
      role: 'authenticated',
      user_id: payload.user_id,
      username: payload.username,
    })

    res.json({ token: newToken })
  } catch (err) {
    next(err)
  }
})

// ============================================================
// GET /auth/me — 获取当前用户信息
// ============================================================
app.get('/auth/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = extractToken(req)
    if (!token) {
      throw new AppError(401, 'unauthorized', '缺少 Authorization token')
    }

    let payload: JWTPayload
    try {
      payload = verifyToken(token)
    } catch {
      throw new AppError(401, 'unauthorized', 'Token 无效或已过期')
    }

    const result = await pool.query(
      'SELECT id, username, nickname, created_at, last_login_at FROM api.users WHERE id = $1',
      [parseInt(payload.user_id, 10)]
    )
    if (result.rows.length === 0) {
      throw new AppError(404, 'not_found', '用户不存在')
    }

    const user = result.rows[0]
    res.json({
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      createdAt: user.created_at,
      lastLoginAt: user.last_login_at,
    })
  } catch (err) {
    next(err)
  }
})

// ============================================================
// 错误处理中间件
// ============================================================
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.error,
      message: err.message,
      details: err.details || null,
    })
    return
  }

  // PostgreSQL unique violation
  if ((err as unknown as Record<string, unknown>).code === '23505') {
    res.status(409).json({
      error: 'conflict',
      message: '数据冲突，请检查输入',
      details: null,
    })
    return
  }

  console.error('[Auth Service Error]', err)
  res.status(500).json({
    error: 'internal_error',
    message: '服务器内部错误',
    details: null,
  })
})

// ============================================================
// 启动服务
// ============================================================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Auth Service] Running on port ${PORT}`)
  console.log(`[Auth Service] Database: ${DATABASE_URL.replace(/:[^:@]+@/, ':***@')}`)
})

// Graceful shutdown
const shutdown = async (signal: string) => {
  console.log(`[Auth Service] ${signal} received, shutting down gracefully...`)
  await pool.end()
  process.exit(0)
}
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

export default app
