import identities from '../../data/grands-prix/f1-identities.json' with { type: 'json' }
import { calendarState, localSessionToUtc, watchDecision } from '../../src/domain/calendar.mjs'
const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec']
const plain = value => value.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&(?:nbsp|ndash);/g, ' ').replace(/\s+/g, ' ').trim()
const nameKey = value => plain(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')
const date = (season, month, day) => { const number = months.indexOf(month.toLowerCase()) + 1; if (!number) throw new Error('Unrecognized official calendar month'); const text = `${season}-${String(number).padStart(2,'0')}-${String(day).padStart(2,'0')}`; if (new Date(text).toISOString().slice(0,10) !== text) throw new Error('Invalid official calendar date'); return text }
export function parseFiaCalendar(html, season) {
  const events = []
  for (const block of html.split(/(?=<div\s+class="event-item\b)/).filter(block => /^<div\s+class="event-item\b/.test(block))) {
    const eventName = plain(block.match(/class="event-name[^\"]*">([\s\S]*?)<\/div>/)?.[1] ?? '')
    const circuit = plain(block.match(/class="event-location[^\"]*">([\s\S]*?)<\/div>/)?.[1] ?? '')
    const day = block.match(/class="day">(\d+)<\/div>/)?.[1], month = block.match(/class="month">([A-Za-z]+)<\/div>/)?.[1]
    if (!eventName || !day || !month) throw new Error('Unrecognized FIA calendar structure')
    events.push({ eventName, circuit, endDate: date(season, month, day), status: /class="event-item[^\"]*cancelled|Called Off/i.test(block) ? 'cancelled' : 'scheduled' })
  }
  if (!events.length) throw new Error('FIA calendar has no recognizable events')
  return events
}
export function parseF1Calendar(html, season) {
  const cards = new Map()
  for (const match of html.matchAll(/<a\b([^>]*href="\/en\/racing\/(\d{4})\/([a-z0-9-]+)"[^>]*)>([\s\S]*?)<\/a>/g)) {
    if (Number(match[2]) !== season) continue
    const text = plain(match[4]); if (!/ROUND\s+\d+/i.test(text)) continue
    const range = text.match(/\b(\d{1,2})(?:\s+([A-Za-z]{3}))?\s*[-–]\s*(\d{1,2})\s+([A-Za-z]{3})\b/)
    if (!range) throw new Error(`Missing official dates for ${match[3]}`)
    const event = { slug: match[3], startDate: date(season, range[2] ?? range[4], range[1]), endDate: date(season, range[4], range[3]), sourceUrl: `https://www.formula1.com/en/racing/${season}/${match[3]}` }
    if (cards.has(event.slug) && JSON.stringify(cards.get(event.slug)) !== JSON.stringify(event)) throw new Error(`Conflicting official calendar cards: ${event.slug}`)
    cards.set(event.slug, event)
  }
  if (!cards.size) throw new Error('F1 calendar has no recognizable rounds')
  return [...cards.values()]
}
/** Read JSON embedded by Next's stream; never evaluate remote script. */
export function parseF1Race(html) {
  const decoded = [...html.matchAll(/self\.__next_f\.push\((\[[\s\S]*?\])\)<\/script>/g)].map(match => { try { return JSON.parse(match[1])[1] ?? '' } catch { return '' } }).join('')
  const marker = /"race":\s*\{/.exec(decoded)
  if (!marker) throw new Error('Missing official structured race/session data')
  const start = decoded.indexOf('{', marker.index); let depth = 0, quoted = false, escaped = false
  for (let i = start; i < decoded.length; i++) {
    const char = decoded[i]
    if (quoted) { if (escaped) escaped = false; else if (char === '\\') escaped = true; else if (char === '"') quoted = false }
    else if (char === '"') quoted = true
    else if (char === '{') depth++
    else if (char === '}' && --depth === 0) return JSON.parse(decoded.slice(start, i + 1))
  }
  throw new Error('Incomplete official structured race data')
}
export function reconcileCalendar(registry, fiaEvents, f1Events) {
  const diagnostics = [], events = []
  const fiaNames = new Map(fiaEvents.map(e => [nameKey(e.eventName), e]))
  for (const fia of fiaEvents) if (!registry.some(e => nameKey(e.eventName) === nameKey(fia.eventName))) diagnostics.push({ status: 'MANUAL_REVIEW', reason: 'UNMAPPED_FIA_EVENT', eventName: fia.eventName })
  for (const f1 of f1Events) {
    const matches = registry.filter(e => (e.f1Slug ?? identities[e.eventName]) === f1.slug)
    const event = matches.length === 1 ? matches[0] : null, fia = event && fiaNames.get(nameKey(event.eventName))
    if (!event || !fia) { diagnostics.push({ status: 'MANUAL_REVIEW', reason: 'UNMAPPED_OFFICIAL_EVENT', slug: f1.slug }); continue }
    if (fia.status === 'cancelled') continue
    events.push({ ...event, ...f1, status: 'scheduled', fiaCircuit: fia.circuit })
    if (event.startDate !== f1.startDate || event.endDate !== f1.endDate || nameKey(fia.circuit) !== nameKey(event.circuit) && !nameKey(event.circuit).includes(nameKey(fia.circuit))) diagnostics.push({ status: 'OFFICIAL_CHANGE', id: event.id, before: { startDate: event.startDate, endDate: event.endDate, circuit: event.circuit }, after: { startDate: f1.startDate, endDate: f1.endDate, fiaCircuit: fia.circuit } })
  }
  for (const fia of fiaEvents.filter(e => e.status !== 'cancelled')) {
    const registered = registry.find(e => nameKey(e.eventName) === nameKey(fia.eventName))
    if (registered && !f1Events.some(e => e.slug === (registered.f1Slug ?? identities[registered.eventName]))) diagnostics.push({ status: 'MANUAL_REVIEW', reason: 'OFFICIAL_SCHEDULE_MISSING', eventName: fia.eventName })
  }
  for (const fia of fiaEvents.filter(e => e.status === 'cancelled')) diagnostics.push({ status: 'CANCELLED', eventName: fia.eventName })
  return { events, diagnostics }
}
async function officialHtml(url, fetchFn) {
  const response = await fetchFn(url, { headers: { 'user-agent': 'FormulaTech-official-calendar/1.0', accept: 'text/html' }, signal: AbortSignal.timeout(25000) })
  if (!response.ok) throw new Error(`Official calendar request ${response.status}: ${url}`)
  const final = new URL(response.url || url)
  if (final.protocol !== 'https:' || !['www.fia.com', 'fia.com', 'www.formula1.com'].includes(final.hostname)) throw new Error('Non-official calendar redirect')
  return response.text()
}
export async function resolveOfficialCalendar(registry, { season, at = new Date(), fetchFn = fetch } = {}) {
  const fiaUrl = `https://www.fia.com/events/fia-formula-one-world-championship/season-${season}/${season}-fia-formula-one-world-championship`
  const f1Url = `https://www.formula1.com/en/racing/${season}`
  const [fiaHtml, f1Html] = await Promise.all([officialHtml(fiaUrl, fetchFn), officialHtml(f1Url, fetchFn)])
  const { events, diagnostics } = reconcileCalendar(registry.filter(e => e.season === season), parseFiaCalendar(fiaHtml, season), parseF1Calendar(f1Html, season))
  if (diagnostics.some(d => d.status === 'MANUAL_REVIEW')) return { status: 'MANUAL_REVIEW', relevant: false, event: null, diagnostics, sources: [fiaUrl, f1Url] }
  const clock = calendarState(events, at), candidate = clock.current ?? clock.next
  if (!candidate) return { status: 'NO_UPCOMING_EVENT', relevant: false, event: null, diagnostics, sources: [fiaUrl, f1Url] }
  const race = parseF1Race(await officialHtml(candidate.sourceUrl, fetchFn))
  if (nameKey(race.meetingName) !== nameKey(candidate.eventName) || Number(race.season) !== season) return { status: 'MANUAL_REVIEW', relevant: false, event: null, diagnostics: [...diagnostics, { reason: 'RACE_IDENTITY_MISMATCH' }], sources: [fiaUrl, f1Url] }
  if (race.meetingStartDate?.slice(0,10) !== candidate.startDate || race.meetingEndDate?.slice(0,10) !== candidate.endDate) return { status: 'MANUAL_REVIEW', relevant: false, event: null, diagnostics: [...diagnostics, { reason: 'CALENDAR_SESSION_DATES_DISAGREE' }], sources: [fiaUrl, f1Url, candidate.sourceUrl] }
  // Sprint weekends still have p1. If absent, use only an explicitly labelled first practice.
  const first = race.meetingSessions?.find(s => s.session === 'p1' || (s.sessionType === 'Practice' && Number(s.sessionNumber) === 1))
  if (!first?.timezone && !race.meetingTimezone) throw new Error('Official FP1 IANA timezone not published')
  if (!first) throw new Error('Official FP1 not published; no guessed session')
  const timeZone = first.timezone ?? race.meetingTimezone, utc = localSessionToUtc(first.startTime, first.gmtOffset, timeZone)
  const advertisedIndex = [...fiaHtml.matchAll(/href\s*=\s*["']([^"']*\/documents\/championships\/[^"']*\/season\/season-\d{4}-\d+[^"']*)["']/g)].map(match => new URL(match[1], fiaUrl)).find(url => (url.hostname === 'fia.com' || url.hostname.endsWith('.fia.com')) && url.pathname.includes(`/season/season-${season}-`))
  const event = { ...candidate, seasonIndexUrl: advertisedIndex?.href.replace(/\/event\/.*$/, '') ?? null, country: race.circuitLocation, circuit: race.circuitOfficialName, fp1: { local: first.startTime, offset: first.gmtOffset, timeZone, utc, sourceUrl: candidate.sourceUrl } }
  if (!event.country || !event.circuit || event.fp1.local.slice(0,10) < event.startDate || event.fp1.local.slice(0,10) > event.endDate) throw new Error('Incomplete or inconsistent official venue/session')
  if (candidate.country !== event.country || candidate.circuit !== event.circuit) diagnostics.push({ status: 'OFFICIAL_VENUE_CHANGE', id: event.id, before: { country: candidate.country, circuit: candidate.circuit }, after: { country: event.country, circuit: event.circuit } })
  const decision = watchDecision(event, at)
  return { status: decision.relevant ? 'RELEVANT_EVENT' : decision.phase, ...decision, event, diagnostics, sources: [fiaUrl, f1Url, candidate.sourceUrl], resolvedAt: at.toISOString() }
}
