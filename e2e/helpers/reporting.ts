import { Buffer } from 'node:buffer'
import type { TestInfo } from '@playwright/test'

function normalizeAttachmentName(name: string) {
  return name.replace(/[^a-zA-Z0-9-_]+/g, '-').replace(/-+/g, '-').toLowerCase()
}

export async function attachJsonReport(testInfo: TestInfo, name: string, payload: unknown) {
  const fileName = `${normalizeAttachmentName(name)}.json`
  const body = Buffer.from(`${JSON.stringify(payload, null, 2)}\n`, 'utf8')

  await testInfo.attach(fileName, {
    body,
    contentType: 'application/json',
  })
}
