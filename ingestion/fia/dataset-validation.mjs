import { publicationDecision, schemaVersion } from './publication.mjs'
import { findDuplicateRecordIds } from './validator.mjs'
const allowedDatasetPattern = /^public\/data\/grands-prix\/(\d{4})\/([a-z0-9-]+)\.json$/
const normalizePath = path => path.replace(/\\/g, '/').trim()
function isOfficialFiaUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && (url.hostname === 'fia.com' || url.hostname.endsWith('.fia.com'))
  } catch {
    return false
  }
}

export function validateAutoPublishDataset(dataset, path, registry) {
  const normalizedPath = normalizePath(path)
  const match = normalizedPath.match(allowedDatasetPattern), season = Number(match?.[1]), grandPrixId = match?.[2]
  const event = registry.find(({ id, season: year }) => id === grandPrixId && year === season)
  const errors = []

  if (!grandPrixId || !event) errors.push('invalid_dataset_path_or_grand_prix')
  if (dataset?.schemaVersion !== schemaVersion) errors.push('invalid_schema_version')
  if (dataset?.season !== season) errors.push('invalid_season')
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
    const decision = publicationDecision({ ...record, validationState: 'validated' }, { grandPrixIds: grandPrixId ? [grandPrixId] : [], season })
    errors.push(...decision.errors.map((error) => `${record?.id ?? 'unknown'}:${error}`))
  }
  if (dataset?.validation?.recordsPublished !== updates.length) errors.push('published_count_mismatch')

  return { valid: errors.length === 0, errors: [...new Set(errors)], grandPrixId, event }
}
