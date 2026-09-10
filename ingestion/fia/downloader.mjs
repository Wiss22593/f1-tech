import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
export async function downloadDocument(document, temporaryDirectory) {
  const response = await fetch(document.sourceUrl, { signal: AbortSignal.timeout(Number(process.env.FIA_FETCH_TIMEOUT_MS ?? 30000)) })
  if (!response.ok) throw new Error(`download failed: ${response.status}`)
  const bytes = new Uint8Array(await response.arrayBuffer()); const contentHash = createHash('sha256').update(bytes).digest('hex')
  await mkdir(temporaryDirectory, { recursive: true }); const path = join(temporaryDirectory, `${document.id}.pdf`)
  await writeFile(path, bytes)
  return { path, contentHash, retrievedAt: new Date().toISOString() }
}
