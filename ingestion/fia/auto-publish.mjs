import { execFile } from 'node:child_process'
import { appendFile, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import { eventRegistry2026, selectIngestionWindowEvents } from './events.mjs'
import { publicationDecision, schemaVersion } from './publication.mjs'
import { findDuplicateRecordIds } from './validator.mjs'

const execFileAsync = promisify(execFile)
const allowedDatasetPattern = /^public\/data\/grands-prix\/2026\/([a-z0-9-]+)\.json$/

const normalizePath = (path) => path.replace(/\\/g, '/').trim()

export function buildAutoPublishChangePlan(paths) {
  const changedPaths = [...new Set(paths.map(normalizePath).filter(Boolean))].sort()
  const datasetPaths = changedPaths.filter((path) => allowedDatasetPattern.test(path))
  const unauthorizedPaths = changedPaths.filter((path) => !allowedDatasetPattern.test(path))
  const status = unauthorizedPaths.length ? 'UNAUTHORIZED_CHANGED_PATHS' : datasetPaths.length ? 'READY' : 'NO_CHANGES'
  return { status, datasetPaths, unauthorizedPaths, safeToCommit: status === 'READY' }
}

function isOfficialFiaUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && (url.hostname === 'fia.com' || url.hostname.endsWith('.fia.com'))
  } catch {
    return false
  }
}

export function validateAutoPublishDataset(dataset, path, registry = eventRegistry2026) {
  const normalizedPath = normalizePath(path)
  const grandPrixId = normalizedPath.match(allowedDatasetPattern)?.[1]
  const event = registry.find(({ id }) => id === grandPrixId)
  const errors = []

  if (!grandPrixId || !event) errors.push('invalid_dataset_path_or_grand_prix')
  if (dataset?.schemaVersion !== schemaVersion) errors.push('invalid_schema_version')
  if (dataset?.season !== 2026) errors.push('invalid_season')
  if (dataset?.grandPrix?.id !== grandPrixId) errors.push('grand_prix_path_mismatch')
  if (!Array.isArray(dataset?.updates) || dataset.updates.length === 0) errors.push('zero_published_records')
  if (!/car\s+presentation\s+submissions?/i.test(dataset?.sourceDocument?.title ?? '')) errors.push('invalid_source_document_title')
  if (!isOfficialFiaUrl(dataset?.sourceDocument?.sourceUrl)) errors.push('non_official_fia_document')
  if (!/^[a-f0-9]{64}$/i.test(dataset?.sourceDocument?.documentHash ?? '')) errors.push('invalid_document_hash')

  const updates = Array.isArray(dataset?.updates) ? dataset.updates : []
  const duplicates = findDuplicateRecordIds(updates)
  if (duplicates.length) errors.push('duplicate_records')
  for (const record of updates) {
    if (record?.validationState !== 'published') errors.push(`${record?.id ?? 'unknown'}:record_not_published`)
    if (record?.contentHash !== dataset?.sourceDocument?.documentHash) errors.push(`${record?.id ?? 'unknown'}:document_hash_mismatch`)
    const decision = publicationDecision({ ...record, validationState: 'validated' }, { grandPrixIds: grandPrixId ? [grandPrixId] : [], season: 2026 })
    errors.push(...decision.errors.map((error) => `${record?.id ?? 'unknown'}:${error}`))
  }
  if (dataset?.validation?.recordsPublished !== updates.length) errors.push('published_count_mismatch')

  return { valid: errors.length === 0, errors: [...new Set(errors)], grandPrixId, event }
}

export function parsePorcelainPaths(output) {
  return output.split(/\r?\n/).filter(Boolean).map((line) => line.slice(3).trim())
}

async function writeGithubOutputs(values) {
  if (!process.env.GITHUB_OUTPUT) return
  const lines = Object.entries(values).map(([key, value]) => `${key}=${String(value)}`).join('\n')
  await appendFile(process.env.GITHUB_OUTPUT, `${lines}\n`)
}

async function reportWindow() {
  const at = process.env.AUTO_PUBLISH_AT ? new Date(process.env.AUTO_PUBLISH_AT) : new Date()
  const events = selectIngestionWindowEvents(eventRegistry2026, at)
  if (events.length > 1) throw new Error(`Multiple ingestion-window events found: ${events.map(({ id }) => id).join(', ')}`)
  const event = events[0] ?? null
  const result = {
    status: event ? 'RELEVANT_EVENT' : 'OUTSIDE_INGESTION_WINDOW',
    timeZone: 'America/Argentina/Buenos_Aires',
    grandPrixId: event?.id ?? null,
    eventName: event?.displayName ?? event?.eventName ?? null,
    datasetPath: event ? `public/data/grands-prix/2026/${event.id}.json` : null,
  }
  await writeGithubOutputs({ relevant: Boolean(event), event_id: event?.id ?? '', event_name: event?.displayName ?? event?.eventName ?? '', dataset_path: result.datasetPath ?? '' })
  console.log(JSON.stringify(result, null, 2))
}

async function validateChanges() {
  const { stdout } = await execFileAsync('git', ['status', '--porcelain=v1', '--untracked-files=all'])
  const plan = buildAutoPublishChangePlan(parsePorcelainPaths(stdout))
  const expectedEventId = process.env.AUTO_PUBLISH_EXPECTED_EVENT_ID ?? null

  if (plan.unauthorizedPaths.length) {
    console.error(JSON.stringify(plan, null, 2))
    throw new Error(`UNAUTHORIZED_CHANGED_PATHS: ${plan.unauthorizedPaths.join(', ')}`)
  }
  if (expectedEventId && plan.datasetPaths.some((path) => path !== `public/data/grands-prix/2026/${expectedEventId}.json`)) {
    throw new Error(`UNEXPECTED_EVENT_DATASET: expected only ${expectedEventId}`)
  }

  const validations = []
  for (const path of plan.datasetPaths) {
    const dataset = JSON.parse(await readFile(resolve(path), 'utf8'))
    const validation = validateAutoPublishDataset(dataset, path)
    validations.push({ path, grandPrixId: validation.grandPrixId, valid: validation.valid, errors: validation.errors })
  }
  const invalid = validations.filter(({ valid }) => !valid)
  if (invalid.length) {
    console.error(JSON.stringify({ ...plan, validations }, null, 2))
    throw new Error(`AUTO_PUBLISH_VALIDATION_FAILED: ${invalid.map(({ path }) => path).join(', ')}`)
  }

  const events = validations.map(({ grandPrixId }) => eventRegistry2026.find(({ id }) => id === grandPrixId)).filter(Boolean)
  const commitMessage = events.length === 1
    ? `data(fia): publish ${events[0].displayName ?? events[0].eventName} 2026 updates`
    : 'data(fia): publish validated 2026 updates'
  const result = { ...plan, validations, commitMessage }
  await writeGithubOutputs({ has_changes: plan.safeToCommit, commit_message: commitMessage })
  console.log(JSON.stringify(result, null, 2))
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const command = process.argv[2]
  if (command === 'window') await reportWindow()
  else if (command === 'validate') await validateChanges()
  else throw new Error('Use auto-publish.mjs window or auto-publish.mjs validate.')
}
