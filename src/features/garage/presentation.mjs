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
