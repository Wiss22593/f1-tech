import { selectLatestPublishedGrandPrixId } from '../../services/fia/latest-published.mjs'

const normalizeHeading = text => (text ?? '').normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase()
/** Compare the rendered localized labels, preserving different, useful component names. */
export function showComponentSubtitle(title, componentName) {
  return Boolean(componentName?.trim()) && normalizeHeading(title) !== normalizeHeading(componentName)
}
/** Called only with datasets accepted by the published-data service. */
export function hasPublishedUpdates(dataset) {
  return Boolean(dataset?.updates?.some(record => record.validationState === 'published' && record.grandPrixId === dataset.grandPrix?.id))
}
export function selectPublishedGarageGrandPrix(events, publishedIds, season, requestedId) {
  const available = events.filter(event => event.season === season)
  if (publishedIds.has(requestedId) && available.some(event => event.id === requestedId)) return requestedId
  return selectLatestPublishedGrandPrixId(available, publishedIds)
}

/** UI-only grouping: exact effective strings, never across component families. */
export function prepareFamilyDetails(updates, getContent) {
  const rows = updates.map((update, index) => ({ update, index, content: getContent(update) }))
    .sort((a, b) => (a.update.fiaRecord?.sourceRowNumber ?? Infinity) - (b.update.fiaRecord?.sourceRowNumber ?? Infinity) || a.index - b.index)
    .map((row, index) => ({ ...row, number: index + 1, specific: { ...row.content } }))
  const shared = []
  for (const field of ['primaryReason', 'geometricDifference', 'description']) {
    const groups = new Map()
    for (const row of rows) {
      const value = row.content[field]
      if (!value) continue
      const key = JSON.stringify([row.update.componentId, value])
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push(row)
    }
    for (const matches of groups.values()) {
      if (matches.length < 2 || matches[0].update.componentId == null) continue
      shared.push({ field, value: matches[0].content[field], numbers: matches.map(row => row.number) })
      for (const row of matches) row.specific[field] = null
    }
  }
  return { rows, shared }
}

/** Short closed mobile label only; options and source records retain their full names. */
export function shortGrandPrixLabel(name) {
  return name.replace(/\s+\d{4}\s*$/, '').replace(/^(?:GRAN PREMIO (?:DE|DI)|GRANDE PR[ÉE]MIO D[EO]|GRAND PRIX D[EUI]|GROSSER PREIS VON)\s+/i, '').replace(/\s+GRAND PRIX$/i, '').trim()
}
