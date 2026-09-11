import { normalizeComponent, normalizeTeam } from './normalizer.mjs'
const isOfficialFiaUrl = (value) => {
  try { const url = new URL(value); return url.protocol === 'https:' && (url.hostname === 'fia.com' || url.hostname.endsWith('.fia.com')) } catch { return false }
}
export function validateUpdate(record, grandPrixIds, season = 2026) {
  const errors = []
  if (!grandPrixIds.includes(record?.grandPrixId)) errors.push('invalid grandPrixId')
  if (record?.season !== undefined && record.season !== season) errors.push('invalid season')
  if (!normalizeTeam(record?.teamId)) errors.push('invalid teamId')
  if (!normalizeComponent(record?.componentId)) errors.push('invalid componentId')
  if (!record?.componentName?.trim()) errors.push('missing componentName')
  if (!record?.sourceDocument?.trim() || record?.source !== 'FIA') errors.push('invalid FIA source document')
  if (!isOfficialFiaUrl(record?.sourceUrl)) errors.push('invalid official FIA sourceUrl')
  if (!record?.sourceText?.trim()) errors.push('missing sourceText')
  if (!record?.briefDescription?.trim() && !record?.geometricDifference?.trim()) errors.push('missing traceable update detail')
  if (record?.contentHash !== undefined && !/^[a-f0-9]{64}$/i.test(record.contentHash)) errors.push('invalid contentHash')
  return { valid: errors.length === 0, errors }
}

/** Identical source rows are duplicates; repeated components with distinct rows are valid. */
export function findDuplicateRecordIds(records) {
  const seen = new Map(); const duplicates = new Set()
  for (const record of records) {
    const key = [record?.grandPrixId, normalizeTeam(record?.teamId), normalizeComponent(record?.componentId), record?.sourceDocument, record?.sourceText].join('|')
    if (seen.has(key)) { duplicates.add(seen.get(key)); duplicates.add(record.id) } else seen.set(key, record.id)
  }
  return [...duplicates]
}
