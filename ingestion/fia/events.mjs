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

function dateInTimeZone(at, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(at)
  const value = Object.fromEntries(parts.map(({ type, value: partValue }) => [type, partValue]))
  return `${value.year}-${value.month}-${value.day}`
}

/**
 * Scheduled automation is relevant only from the day before an event through
 * its final day. Date comparison uses the product's operating timezone rather
 * than the runner's UTC calendar day.
 */
export function selectIngestionWindowEvents(events, at = new Date(), { daysBefore = 1, daysAfter = 0, timeZone = 'America/Argentina/Buenos_Aires' } = {}) {
  const day = Date.parse(`${dateInTimeZone(at, timeZone)}T00:00:00Z`)
  const oneDay = 24 * 60 * 60 * 1000
  return events.filter((event) => {
    const windowStart = Date.parse(`${event.startDate}T00:00:00Z`) - (daysBefore * oneDay)
    const windowEnd = Date.parse(`${event.endDate}T00:00:00Z`) + (daysAfter * oneDay)
    return day >= windowStart && day <= windowEnd
  })
}
