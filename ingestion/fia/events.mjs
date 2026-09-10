import { readFile } from 'node:fs/promises'

const registry = JSON.parse(await readFile(new URL('../../data/grands-prix/2026.json', import.meta.url), 'utf8'))

export const eventRegistry2026 = registry.map((event) => ({ id: event.grandPrixId, eventName: event.eventName, displayName: event.displayName ?? event.eventName, country: event.country, circuit: event.circuit, startDate: event.startDate, endDate: event.endDate, indexUrl: event.fiaIndexUrl, ingestionStatus: event.ingestionStatus, documentId: event.documentId ?? null }))

export function selectCurrentEvents(events, at = new Date()) {
  const day = at.toISOString().slice(0, 10)
  const active = events.filter((event) => event.startDate <= day && event.endDate >= day)
  if (active.length) return active
  const upcoming = events.filter((event) => event.startDate > day).sort((a, b) => a.startDate.localeCompare(b.startDate))[0]
  return upcoming ? [upcoming] : []
}
