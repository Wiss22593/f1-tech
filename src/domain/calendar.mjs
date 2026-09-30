import { selectLatestPublishedGrandPrixId } from '../services/fia/latest-published.mjs'
export function supportedSeasons(events) { return [...new Set(events.map(event => Number(event.season)))].filter(Number.isInteger).sort((a, b) => b - a) }
export function defaultSeason(events, at = new Date()) { const seasons = supportedSeasons(events), current = at.getFullYear(); return seasons.includes(current) ? current : seasons[0] ?? null }
export function seasonEvents(events, season) { return events.filter(event => Number(event.season) === Number(season)) }
/** One event clock shared by the UI's empty-season context and ingestion. */
export function calendarState(events, at = new Date()) {
  const now = at.getTime(), start = e => Date.parse(e.startUtc ?? `${e.startDate}T00:00:00Z`), end = e => Date.parse(e.endUtc ?? `${e.endDate}T23:59:59.999Z`)
  const active = events.filter(e => e.status !== 'cancelled').sort((a, b) => start(a) - start(b))
  return { current: active.find(e => start(e) <= now && end(e) >= now) ?? null, next: active.find(e => start(e) > now) ?? null, lastFinished: [...active].reverse().find(e => end(e) < now) ?? null, nextFp1: active.filter(e => e.fp1 && Date.parse(e.fp1.utc) > now).sort((a, b) => Date.parse(a.fp1.utc) - Date.parse(b.fp1.utc))[0] ?? null }
}
export function selectSeasonGrandPrix(events, publishedIds, season, requestedId, at = new Date()) {
  const available = seasonEvents(events, season)
  if (requestedId && available.some(e => e.id === requestedId)) return requestedId
  const latest = selectLatestPublishedGrandPrixId(available, publishedIds), clock = calendarState(available, at)
  return latest ?? clock.current?.id ?? clock.next?.id ?? available.find(e => e.status !== 'cancelled')?.id ?? null
}
export function localSessionToUtc(local, offset, timeZone) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(local) || !/^[+-]\d{2}:\d{2}$/.test(offset)) throw new Error('Invalid official session timestamp/offset')
  const stamp = new Date(local + offset)
  if (!Number.isFinite(stamp.getTime())) throw new Error('Invalid official session timestamp')
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(stamp).map(p => [p.type, p.value]))
  if (`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}` !== local) throw new Error('Official session offset does not match its IANA timezone')
  return stamp.toISOString()
}
/** Resolve a local wall clock through IANA rules, including DST at the event end. */
export function zonedLocalToUtc(local, timeZone) {
  const target = Date.parse(local + 'Z'); let guess = target
  for (let i = 0; i < 4; i++) {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(guess)).map(p => [p.type, p.value]))
    const wall = `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`
    if (wall === local) return new Date(guess).toISOString()
    guess += target - Date.parse(wall + 'Z')
  }
  throw new Error('Unresolvable IANA local timestamp')
}
export function watchWindow(event) {
  const fp1 = Date.parse(event.fp1?.utc)
  if (!Number.isFinite(fp1)) throw new Error('No verified FP1 timestamp')
  const catchUpEnd = Date.parse(zonedLocalToUtc(`${event.endDate}T23:59:59`, event.fp1.timeZone))
  return { start: new Date(fp1 - 8 * 3600000).toISOString(), end: new Date(fp1 + 4 * 3600000).toISOString(), catchUpEnd: new Date(catchUpEnd).toISOString() }
}
export function watchDecision(event, at = new Date()) {
  const window = watchWindow(event), now = at.getTime(), start = Date.parse(window.start), end = Date.parse(window.end), catchUp = Date.parse(window.catchUpEnd)
  const intensive = now >= start && now <= end
  // Generic workflow starts at :17/:47. Catch up every two hours at :17 UTC.
  const catchUpDue = now > end && now <= catchUp && at.getUTCHours() % 2 === 0 && at.getUTCMinutes() < 30
  const nextTick = Math.floor(now / 1800000) * 1800000 + 17 * 60000
  let nextCheck = nextTick <= now ? nextTick + 1800000 : nextTick
  if (now < start) { nextCheck = Math.floor(start / 1800000) * 1800000 + 17 * 60000; if (nextCheck < start) nextCheck += 1800000 }
  else if (now >= end) { while (nextCheck <= catchUp && (new Date(nextCheck).getUTCHours() % 2 !== 0 || new Date(nextCheck).getUTCMinutes() !== 17)) nextCheck += 1800000 }
  return { ...window, relevant: intensive || catchUpDue, phase: intensive ? 'FP1_WINDOW' : now > end && now <= catchUp ? 'CATCH_UP' : 'OUTSIDE_FP1_WINDOW', nextCheckUtc: nextCheck <= catchUp ? new Date(nextCheck).toISOString() : null }
}
