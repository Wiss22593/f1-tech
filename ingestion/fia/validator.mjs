import { normalizeComponent, normalizeTeam } from './normalizer.mjs'
export function validateUpdate(record, grandPrixIds, season = 2026) {
  const errors = []
  if (!grandPrixIds.includes(record?.grandPrixId)) errors.push('invalid grandPrixId')
  if (record?.season !== undefined && record.season !== season) errors.push('invalid season')
  if (!normalizeTeam(record?.teamId)) errors.push('invalid teamId')
  if (!normalizeComponent(record?.componentId)) errors.push('invalid componentId')
  if (!record?.sourceDocument?.trim() || !record?.source?.trim()) errors.push('missing source document')
  try { if (!record?.sourceUrl || new URL(record.sourceUrl).protocol !== 'https:') errors.push('invalid sourceUrl') } catch { errors.push('invalid sourceUrl') }
  if (!record?.sourceText?.trim() || !record?.description?.trim()) errors.push('missing description')
  if (record?.contentHash !== undefined && !/^[a-f0-9]{64}$/i.test(record.contentHash)) errors.push('invalid contentHash')
  return { valid: errors.length === 0, errors }
}

/** A publication batch cannot contain two records for the same source document and component. */
export function findDuplicateRecordIds(records) {
  const seen = new Map(); const duplicates = new Set()
  for (const record of records) {
    const key = [record?.grandPrixId, normalizeTeam(record?.teamId), normalizeComponent(record?.componentId), record?.sourceDocument].join('|')
    if (seen.has(key)) { duplicates.add(seen.get(key)); duplicates.add(record.id) } else seen.set(key, record.id)
  }
  return [...duplicates]
}
