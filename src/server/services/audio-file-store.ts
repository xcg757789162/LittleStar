/**
 * Audio File Store — Server-side audio file management
 *
 * Extracts base64-encoded audio from classroom JSON and writes to disk.
 * Files are served by Nginx via /media/audio/... static path.
 *
 * Directory layout:
 *   /data/media/audio/{childId}/{knowledgeNodeId}_{date}/{audioId}.{ext}
 *
 * Nginx maps /media/ → /data/media/ with 30-day cache + immutable headers.
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import type { GeneratedClassroom } from './pipeline-executor.js'

const MEDIA_DATA_DIR = process.env.MEDIA_DATA_DIR || '/data/media'
const AUDIO_SUBDIR = 'audio'

function audioDir(childId: number, knowledgeNodeId: string, date: string): string {
  const safeNodeId = knowledgeNodeId.replace(/[^a-zA-Z0-9_-]/g, '_')
  const safeDate = date.replace(/[^0-9-]/g, '')
  return path.join(MEDIA_DATA_DIR, AUDIO_SUBDIR, String(childId), `${safeNodeId}_${safeDate}`)
}

function audioFilePath(dir: string, audioId: string, ext: string): string {
  const safeId = audioId.replace(/[^a-zA-Z0-9_-]/g, '_')
  return path.join(dir, `${safeId}.${ext}`)
}

function audioPublicUrl(childId: number, knowledgeNodeId: string, date: string, audioId: string, ext: string): string {
  const safeNodeId = knowledgeNodeId.replace(/[^a-zA-Z0-9_-]/g, '_')
  const safeDate = date.replace(/[^0-9-]/g, '')
  const safeId = audioId.replace(/[^a-zA-Z0-9_-]/g, '_')
  return `/media/${AUDIO_SUBDIR}/${childId}/${safeNodeId}_${safeDate}/${safeId}.${ext}`
}

interface AudioAction {
  type: string
  audioBase64?: string
  audioId?: string
  audioUrl?: string
  [key: string]: unknown
}

function inferExtension(format?: string): string {
  if (!format) return 'mp3'
  const f = format.trim().toLowerCase()
  if (f.includes('wav')) return 'wav'
  if (f.includes('ogg')) return 'ogg'
  if (f.includes('webm')) return 'webm'
  if (f.includes('aac')) return 'aac'
  if (f.includes('flac')) return 'flac'
  return 'mp3'
}

function detectFormatFromDataUri(dataUri: string): string {
  const match = dataUri.match(/^data:audio\/(\w+);/)
  return match ? inferExtension(match[1]) : 'mp3'
}

function stripDataUriPrefix(base64: string): string {
  const idx = base64.indexOf(',')
  if (idx >= 0 && base64.startsWith('data:')) return base64.slice(idx + 1)
  return base64
}

/**
 * Extract all base64 audio from a classroom JSON, write to files, and
 * replace inline audio with file URLs.
 *
 * Mutates the classroom object in place. Returns the count of files written.
 */
export async function externalizeClassroomAudio(
  classroom: GeneratedClassroom,
  childId: number,
  knowledgeNodeId: string,
  date: string,
): Promise<number> {
  const dir = audioDir(childId, knowledgeNodeId, date)
  let written = 0
  let dirCreated = false

  for (const scene of classroom.scenes) {
    if (!Array.isArray(scene.actions)) continue

    for (const rawAction of scene.actions) {
      const action = rawAction as AudioAction
      if (action.type !== 'speech') continue

      const base64 = action.audioBase64
      if (!base64 || !base64.trim()) continue

      const audioId = action.audioId || `audio-${written}`
      const ext = action.audioUrl
        ? detectFormatFromDataUri(action.audioUrl)
        : inferExtension((action as Record<string, unknown>).format as string | undefined)

      if (!dirCreated) {
        await fs.mkdir(dir, { recursive: true })
        dirCreated = true
      }

      const filePath = audioFilePath(dir, audioId, ext)
      const rawBase64 = stripDataUriPrefix(base64)
      await fs.writeFile(filePath, Buffer.from(rawBase64, 'base64'))

      action.audioUrl = audioPublicUrl(childId, knowledgeNodeId, date, audioId, ext)
      delete action.audioBase64
      written++
    }
  }

  if (written > 0) {
    console.log(`[AudioFileStore] Wrote ${written} audio files to ${dir}`)
  }

  return written
}

/**
 * Remove all audio files for a given cache entry.
 */
export async function removeAudioFiles(
  childId: number,
  knowledgeNodeId: string,
  date: string,
): Promise<void> {
  const dir = audioDir(childId, knowledgeNodeId, date)
  try {
    await fs.rm(dir, { recursive: true, force: true })
    console.log(`[AudioFileStore] Removed audio dir: ${dir}`)
  } catch {
    // Directory may not exist — that's fine
  }
}

/**
 * Remove all audio files for a child (e.g., on account deletion).
 */
export async function removeChildAudioFiles(childId: number): Promise<void> {
  const dir = path.join(MEDIA_DATA_DIR, AUDIO_SUBDIR, String(childId))
  try {
    await fs.rm(dir, { recursive: true, force: true })
    console.log(`[AudioFileStore] Removed all audio for child ${childId}`)
  } catch {
    // Directory may not exist
  }
}
