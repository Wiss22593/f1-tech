import { mkdir, rename, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { findDuplicateRecordIds, validateUpdate } from './validator.mjs'

export const schemaVersion = 'fia-published-dataset-v1'
const officialFiaSource = (url) => {
  try { const host = new URL(url).hostname.toLowerCase(); return host === 'fia.com' || host.endsWith('.fia.com') } catch { return false }
}

/** A record must satisfy every deterministic guard before it can leave review. */
export function publicationDecision(record, { grandPrixIds, season }) {
  const validation = validateUpdate(record, grandPrixIds, season)
  const errors = [...validation.errors]
  if (!officialFiaSource(record?.sourceUrl)) errors.push('non_official_fia_source')
  if (record?.parserConfidence !== 'deterministic_table') errors.push('insufficient_parser_confidence')
  if (record?.validationState !== 'validated') errors.push('record_not_validated')
  return { publishable: errors.length === 0, errors }
}

export function createPublicationPlan({ document, records, rejected = [], grandPrix, season, parserVersion = 'fia-table-v1' }) {
  const duplicates = new Set(findDuplicateRecordIds(records)); const manualReview = [...rejected]
  const published = []
  for (const record of records) {
    const decision = publicationDecision(record, { grandPrixIds: [grandPrix.id], season })
    if (duplicates.has(record.id)) decision.errors.push('duplicate_record')
    if (decision.errors.length) manualReview.push({ id: record.id, sourceText: record.sourceText ?? null, reason: decision.errors, suggestedComponentIds: [] })
    else published.push({ ...record, validationState: 'published', publishedAt: new Date().toISOString() })
  }
  const publishedAt = published[0]?.publishedAt ?? null
  return {
    dataset: published.length ? { schemaVersion, grandPrix, season, teams: [...new Set(published.map(({ teamId }) => teamId))], updates: published, sourceDocument: { id: document.id, title: document.title, sourceUrl: document.sourceUrl, documentId: document.documentId ?? null, documentHash: document.contentHash, retrievedAt: document.retrievedAt }, retrievedAt: document.retrievedAt, publishedAt, parserVersion, validation: { recordsReceived: records.length, recordsPublished: published.length, manualReview: manualReview.length } } : null,
    manualReview,
  }
}

/** Hash, schema and parser version together define a byte-stable publication rerun. */
export function isPublishedDatasetCurrent(current, candidate, contentHash, parserVersion) {
  if (!candidate
    || current?.sourceDocument?.documentHash !== contentHash
    || current?.schemaVersion !== candidate.schemaVersion
    || current?.parserVersion !== parserVersion) return false
  const stableUpdates = (updates = []) => [...updates]
    .map(({ publishedAt: _publishedAt, ...update }) => update)
    .sort((a, b) => String(a.id).localeCompare(String(b.id)))
  return JSON.stringify(stableUpdates(current.updates)) === JSON.stringify(stableUpdates(candidate.updates))
    && JSON.stringify(current.validation ?? null) === JSON.stringify(candidate.validation ?? null)
}

/** Write-replace avoids replacing a working public file with a partial result. */
export async function writePublishedDatasetAtomically(filePath, dataset) {
  if (!dataset?.updates?.length) throw new Error('Refusing to replace a published dataset with an empty or invalid dataset.')
  await mkdir(dirname(filePath), { recursive: true })
  const temporaryPath = `${filePath}.next`
  await writeFile(temporaryPath, `${JSON.stringify(dataset, null, 2)}\n`)
  await rename(temporaryPath, filePath)
  return resolve(filePath)
}

export async function writeJson(filePath, data) {
  await mkdir(dirname(filePath), { recursive: true })
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`)
  return resolve(filePath)
}
