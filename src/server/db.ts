/**
 * 后端数据库连接池
 *
 * 使用 pg Pool 直连 PostgreSQL，绕过 PostgREST RLS。
 * 后端服务不走 PostgREST 认证体系，直接使用 postgres 超级用户。
 */

import pg from 'pg'

const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ||
    `postgresql://${process.env.POSTGRES_USER || 'postgres'}:${process.env.POSTGRES_PASSWORD || 'postgres'}@${process.env.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || '5432'}/${process.env.POSTGRES_DB || 'littlestar'}`,
  max: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
})

export { pool }
