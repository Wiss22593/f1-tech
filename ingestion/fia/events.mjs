import { calendarState } from '../../src/domain/calendar.mjs'
import { readFile, readdir } from 'node:fs/promises'

const registryDirectory = new URL('../../data/grands-prix/', import.meta.url)
const files = (await readdir(registryDirectory)).filter(file => /^\d{4}\.json$/.test(file))
const registry = (await Promise.all(files.map(async file => JSON.parse(await readFile(new URL(file, registryDirectory), 'utf8'))))).flat()

export const eventRegistry = registry.map((event) => ({ id: event.grandPrixId, f1Slug: event.f1Slug ?? null, season: event.season, status: event.ingestionStatus === 'CANCELLED' ? 'cancelled' : 'scheduled', eventName: event.eventName, displayName: event.displayName ?? event.eventName, country: event.country, circuit: event.circuit, startDate: event.startDate, endDate: event.endDate, indexUrl: event.fiaIndexUrl, ingestionStatus: event.ingestionStatus, documentId: event.documentId ?? null }))

export const eventRegistry2026 = eventRegistry.filter(event => event.season === 2026)

export function selectCurrentEvents(events, at = new Date()) {
  const clock = calendarState(events, at)
  const event = clock.current ?? clock.next
  return event ? [event] : []
}

function dateInTimeZone(at, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(at)
  const value = Object.fromEntries(parts.map(({ type, value: partValue }) => [type, partValue]))
  return `${value.year}-${value.month}-${value.day}`
}

/**
 * Compatibility date-window for explicit legacy backfill commands only.
 * Scheduled publication uses official-calendar.mjs and its verified FP1 timestamps.
 */
export function selectIngestionWindowEvents(events, at = new Date(), { daysBefore = 1, daysAfter = 1, timeZone = 'America/Argentina/Buenos_Aires' } = {}) {
  const day = Date.parse(`${dateInTimeZone(at, timeZone)}T00:00:00Z`)
  const oneDay = 24 * 60 * 60 * 1000
  return events.filter((event) => {
    const windowStart = Date.parse(`${event.startDate}T00:00:00Z`) - (daysBefore * oneDay)
    const windowEnd = Date.parse(`${event.endDate}T00:00:00Z`) + (daysAfter * oneDay)
    return day >= windowStart && day <= windowEnd
  })
}
