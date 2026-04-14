#!/usr/bin/env npx tsx
/**
 * Migration script: Extract inline audioBase64 from existing classroom JSON
 * and write to the file system.
 *
 * Processes both classroom_cache and classroom_snapshots tables.
 *
 * Usage:
 *   npx tsx scripts/migrate-audio-to-files.ts
 *
 * After running, execute the SQL cleanup:
 *   SELECT api.strip_audio_base64_from_cache();
 *   SELECT api.strip_audio_base64_from_snapshots();
 *
 * Environment:
 *   DATABASE_URL or POSTGRES_* env vars (same as server)
 *   MEDIA_DATA_DIR (default: /data/media)
 */

import pg from 'pg'
import fs from 'node:fs/promises'
import path from 'node:path'

const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ||
    `postgresql://${process.env.POSTGRES_USER || 'postgres'}:${process.env.POSTGRES_PASSWORD || 'postgres'}@${process.env.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || '5432'}/${process.env.POSTGRES_DB || 'littlestar'}`,
  max: 3,
})

const MEDIA_DATA_DIR = process.env.MEDIA_DATA_DIR || '/data/media'
const AUDIO_DIR = path.join(MEDIA_DATA_DIR, 'audio')

function sanitize(s: string): string {
  return s.replace(/[^a-zA-Z0-9_-]/g, '_')
}

function inferExt(audioUrl?: string): string {
  if (!audioUrl) return 'mp3'
  const match = audioUrl.match(/data:audio\/(\w+);/)
  if (match) {
    const fmt = match[1].toLowerCase()
    if (fmt === 'wav') return 'wav'
    if (fmt === 'ogg') return 'ogg'
    return 'mp3'
  }
  return 'mp3'
}

function stripDataUri(base64: string): string {
  const idx = base64.indexOf(',')
  if (idx >= 0 && base64.startsWith('data:')) return base64.slice(idx + 1)
  return base64
}

interface ActionLike {
  type: string
  audioBase64?: string
  audioId?: string
  audioUrl?: string
}

interface SceneLike {
  actions?: ActionLike[]
}

interface ClassroomLike {
  scenes?: SceneLike[]
}

async function processClassroom(
  classroom: ClassroomLike,
  childId: number,
  knowledgeNodeId: string,
  date: string,
): Promise<number> {
  const safeNodeId = sanitize(knowledgeNodeId)
  const safeDate = date.replace(/[^0-9-]/g, '')
  const dir = path.join(AUDIO_DIR, String(childId), `${safeNodeId}_${safeDate}`)
  let written = 0
  let dirCreated = false

  for (const scene of classroom.scenes ?? []) {
    for (const action of scene.actions ?? []) {
      if (action.type !== 'speech' || !action.audioBase64?.trim()) continue

      // Skip if audioUrl is already an HTTP path (already migrated)
      if (action.audioUrl?.startsWith('/media/')) continue

      const audioId = action.audioId || `audio-${written}`
      const ext = inferExt(action.audioUrl)

      if (!dirCreated) {
        await fs.mkdir(dir, { recursive: true })
        dirCreated = true
      }

      const safeId = audioId.replace(/[^a-zA-Z0-9_-]/g, '_')
      const filePath = path.join(dir, `${safeId}.${ext}`)
      const rawBase64 = stripDataUri(action.audioBase64)
      await fs.writeFile(filePath, Buffer.from(rawBase64, 'base64'))

      // Update the audioUrl to point to the file
      action.audioUrl = `/media/audio/${childId}/${safeNodeId}_${safeDate}/${safeId}.${ext}`
      written++
    }
  }

  return written
}

async function migrateTable(tableName: string, joinClause: string): Promise<void> {
  console.log(`\n--- Migrating ${tableName} ---`)

  const { rows } = await pool.query<{
    id: number
    child_id: number
    knowledge_node_id: string
    date: string
    classroom_data: ClassroomLike
  }>(
    `SELECT t.id, ${joinClause}
     FROM ${tableName} t
     ${tableName === 'api.classroom_snapshots'
      ? 'JOIN api.classroom_history ch ON t.history_id = ch.id'
      : ''
    }`,
  )

  console.log(`Found ${rows.length} rows`)
  let totalFiles = 0
  let processedRows = 0

  for (const row of rows) {
    const classroom = typeof row.classroom_data === 'string'
      ? JSON.parse(row.classroom_data)
      : row.classroom_data

    const count = await processClassroom(
      classroom, row.child_id, row.knowledge_node_id, row.date,
    )

    if (count > 0) {
      // Update the JSON in DB with new audioUrls (audioBase64 will be stripped by SQL function)
      await pool.query(
        `UPDATE ${tableName} SET classroom_data = $1 WHERE id = $2`,
        [JSON.stringify(classroom), row.id],
      )
      totalFiles += count
      processedRows++
    }
  }

  console.log(`${tableName}: processed ${processedRows} rows, wrote ${totalFiles} audio files`)
}

async function main(): Promise<void> {
  console.log('=== Audio Migration: Inline base64 → File System ===')
  console.log(`MEDIA_DATA_DIR: ${MEDIA_DATA_DIR}`)

  await fs.mkdir(AUDIO_DIR, { recursive: true })

  await migrateTable(
    'api.classroom_cache',
    't.child_id, t.knowledge_node_id, t.date, t.classroom_data',
  )

  await migrateTable(
    'api.classroom_snapshots',
    'ch.child_id, ch.knowledge_node_id, ch.date, t.classroom_data',
  )

  // Now strip audioBase64 from the JSON in DB
  console.log('\n--- Stripping audioBase64 from DB JSON ---')

  const cacheResult = await pool.query('SELECT api.strip_audio_base64_from_cache()')
  console.log(`classroom_cache: stripped ${cacheResult.rows[0].strip_audio_base64_from_cache} rows`)

  const snapshotResult = await pool.query('SELECT api.strip_audio_base64_from_snapshots()')
  console.log(`classroom_snapshots: stripped ${snapshotResult.rows[0].strip_audio_base64_from_snapshots} rows`)

  await pool.end()
  console.log('\n=== Migration complete ===')
}

main().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
