import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { supportedSeasons, defaultSeason, seasonEvents, selectSeasonGrandPrix, calendarState, localSessionToUtc, zonedLocalToUtc, watchWindow, watchDecision } from '../src/domain/calendar.mjs'
import { parseFiaCalendar, parseF1Calendar, parseF1Race, reconcileCalendar, resolveOfficialCalendar } from '../ingestion/fia/official-calendar.mjs'
import { eventRegistry } from '../ingestion/fia/events.mjs'
import { runScheduled } from '../ingestion/fia/scheduled.mjs'
import { fetchFiaDocumentIndex } from '../ingestion/fia/finder.mjs'
import { garageUpdateCount } from '../src/i18n/update-count.mjs'
import { publishedUpdateCounts } from '../src/services/fia/update-counts.mjs'
const fixture = JSON.parse(await readFile(new URL('./fixtures/official-sepang-sessions.json', import.meta.url)))
const base = eventRegistry.find(e => e.id === 'bahrain-2026')
const event = { ...base, fp1: { local: '2026-10-02T12:30:00', offset: '+08:00', timeZone: 'Asia/Kuala_Lumpur', utc: '2026-10-02T04:30:00.000Z' } }
const raceHtml = race => `<script>self.__next_f.push(${JSON.stringify([1, '0:'+JSON.stringify({race})])})</script>`
const fiaHtml = (name = base.eventName, circuit = 'SEPANG', cancelled = false) => `<div class="event-item ${cancelled ? 'cancelled' : 'active'}"><div class="day">04</div><div class="month">Oct</div><div class="event-name cell">${name}</div><div class="event-location">${circuit}</div></div>`
const f1Html = (slug = 'bahrain', dates = '02 - 04 Oct') => `<a href="/en/racing/2026/${slug}"><span>ROUND 16 ${dates}</span></a>`
const resolver = async (race, options = {}) => resolveOfficialCalendar([base], { season: 2026, at: new Date('2026-09-30T12:00:00Z'), fetchFn: async url => new Response(url.includes('fia.com') ? fiaHtml(options.name, options.circuit, options.cancelled) : url.endsWith('/2026') ? f1Html(options.slug, options.dates) : raceHtml(race)) })

test('official Sepang fixture resolves Malaysia local, UTC and Argentina without a weekday rule', async () => {
  const result = await resolver(fixture.race)
  assert.equal(result.event.id, 'bahrain-2026'); assert.equal(result.event.country, 'Malaysia'); assert.equal(result.event.circuit, 'Sepang International Circuit')
  assert.equal(result.event.fp1.utc, '2026-10-02T04:30:00.000Z'); assert.equal(result.event.fp1.local, '2026-10-02T12:30:00')
  assert.equal(new Intl.DateTimeFormat('en-GB', {timeZone:'America/Argentina/Buenos_Aires',hour:'2-digit',minute:'2-digit'}).format(new Date(result.event.fp1.utc)), '01:30')
})
test('normal Friday, Thursday and Sprint weekends resolve the explicit first practice', async () => {
  for (const [local, startDate, sprint] of [['2026-10-02T12:30:00','02',false],['2026-10-01T12:30:00','01',false],['2026-10-02T12:30:00','02',true]]) {
    const race = structuredClone(fixture.race); race.meetingSessions[0].startTime = local; race.meetingStartDate = `2026-10-${startDate}T00:00:00.000Z`
    if (sprint) race.meetingSessions[1].sessionType = 'SprintQualifying'
    const result = await resolver(race,{dates:`${startDate} - 04 Oct`}); assert.equal(result.event.fp1.local,local)
  }
})
test('FP1 window has exact -8h/+4h boundaries and includes nighttime UTC/Argentina', () => {
  assert.deepEqual(watchWindow(event), {start:'2026-10-01T20:30:00.000Z',end:'2026-10-02T08:30:00.000Z',catchUpEnd:'2026-10-04T15:59:59.000Z'})
  for(const at of ['2026-10-01T20:30:00Z','2026-10-02T04:47:00Z','2026-10-02T08:30:00Z'])assert.equal(watchDecision(event,new Date(at)).relevant,true)
  assert.equal(watchDecision(event,new Date('2026-10-01T20:29:59Z')).relevant,false)
  assert.equal(watchDecision(event,new Date('2026-09-30T12:00:00Z')).nextCheckUtc,'2026-10-01T20:47:00.000Z')
})
test('catch-up polls every two hours and stops at the final local day', () => {
  assert.equal(watchDecision(event,new Date('2026-10-02T10:17:00Z')).relevant,true)
  assert.equal(watchDecision(event,new Date('2026-10-02T10:47:00Z')).relevant,false)
  assert.equal(watchDecision(event,new Date('2026-10-02T11:17:00Z')).relevant,false)
  assert.equal(watchDecision(event,new Date('2026-10-04T16:17:00Z')).relevant,false)
})
test('timezone offsets are checked against IANA rules and catch-up handles DST', () => {
  assert.throws(()=>localSessionToUtc('2026-10-02T12:30:00','+03:00','Asia/Kuala_Lumpur'),/IANA/)
  assert.equal(zonedLocalToUtc('2026-11-01T23:59:59','America/New_York'),'2026-11-02T04:59:59.000Z')
})
test('official date and venue moves preserve identity and use the new schedule', async () => {
  const race=structuredClone(fixture.race); race.meetingStartDate='2026-10-09T00:00:00.000Z';race.meetingEndDate='2026-10-11T23:59:59.999Z';race.meetingSessions[0].startTime='2026-10-09T13:00:00';race.circuitOfficialName='Changed Official Venue';
  const result=await resolver(race,{dates:'09 - 11 Oct',circuit:'Changed Official Venue'});
  assert.equal(result.event.id,base.id);assert.equal(result.event.startDate,'2026-10-09');assert.equal(result.event.circuit,'Changed Official Venue');assert.equal(result.event.fp1.utc,'2026-10-09T05:00:00.000Z');assert.equal(result.start,'2026-10-08T21:00:00.000Z')
})
test('official FP1 time changes alter the watch window automatically', async () => {
  const race=structuredClone(fixture.race);race.meetingSessions[0].startTime='2026-10-02T14:00:00';
  const result=await resolver(race);assert.equal(result.event.fp1.utc,'2026-10-02T06:00:00.000Z');assert.equal(result.start,'2026-10-01T22:00:00.000Z')
})
test('cancelled event is never next; unmapped new event goes to manual review without IDs',async()=>{
  assert.equal((await resolver(fixture.race,{cancelled:true})).status,'NO_UPCOMING_EVENT')
  const result=await resolver(fixture.race,{slug:'new-event',name:'New Grand Prix'});assert.equal(result.status,'MANUAL_REVIEW');assert.equal(result.relevant,false);assert.equal(result.event,null)
})
test('race identity mismatch and missing FP1 cannot trigger discovery',async()=>{
  const race=structuredClone(fixture.race);race.meetingName='Another Grand Prix';assert.equal((await resolver(race)).status,'MANUAL_REVIEW')
  race.meetingName=base.eventName;race.meetingSessions=race.meetingSessions.filter(s=>s.session!=='p1');await assert.rejects(resolver(race),/FP1/)
})
test('official parsers support cross-month weekends and reject unrecognized documents',()=>{
  assert.equal(parseF1Calendar(f1Html('mexico','30 Oct - 01 Nov'),2026)[0].endDate,'2026-11-01')
  assert.equal(parseFiaCalendar(fiaHtml(),2026)[0].eventName,base.eventName)
  assert.deepEqual(parseF1Race(raceHtml(fixture.race)),fixture.race)
  assert.throws(()=>parseF1Race('<script>doSomething()</script>'),/structured/)
})
test('next, current, last finished and next FP1 share a single chronological selector',()=>{
  const past={id:'past',startDate:'2026-09-24',endDate:'2026-09-26'},future={...event,id:'later',startDate:'2026-10-09',endDate:'2026-10-11',fp1:{utc:'2026-10-09T04:30:00Z'}},cancelled={...event,id:'cancelled',status:'cancelled'}
  const state=calendarState([future,event,past,cancelled],new Date('2026-09-30T00:00:00Z'));assert.equal(state.next.id,event.id);assert.equal(state.lastFinished.id,'past');assert.equal(state.nextFp1.id,event.id)
  assert.equal(calendarState([event,future],new Date('2026-10-02T05:00:00Z')).current.id,event.id)
})
test('reconciliation maps the exact FIA identity even when its venue changes',()=>{
  const result=reconcileCalendar([base], [{eventName:base.eventName,circuit:'NEW VENUE',status:'scheduled'}],parseF1Calendar(f1Html(),2026));assert.equal(result.events[0].id,base.id);assert.equal(result.events[0].fiaCircuit,'NEW VENUE')
})
test('outside FP1 window succeeds without touching FIA documents or pipeline',async()=>{
  const result=await runScheduled({resolution:{event},at:new Date('2026-09-30T00:00:00Z'),publish:true,findIndex:()=>{throw new Error('must not fetch')}});assert.equal(result.status,'SKIP_OUTSIDE_WINDOW')
})
test('inside FP1 window discovers documents; absence is success and publishes nothing',async()=>{
  let discoveries=0;const result=await runScheduled({resolution:{event},at:new Date(event.fp1.utc),publish:true,findIndex:async()=>event.indexUrl,findDocuments:async()=>{discoveries++;return[]},pipeline:()=>{throw new Error('must not publish')}})
  assert.equal(discoveries,1);assert.equal(result.status,'NO_DOCUMENT_FOUND');assert.equal(result.needsPipeline,false)
})
test('preflight requests pipeline only for a new official presentation; changed bytes are detected',async()=>{
  const current=JSON.parse(await readFile(new URL('../public/data/grands-prix/2026/azerbaijan-2026.json',import.meta.url))),az={...eventRegistry.find(e=>e.id==='azerbaijan-2026'),fp1:event.fp1,endDate:event.endDate}
  const options={resolution:{event:az},at:new Date(event.fp1.utc),preflight:true,findIndex:async()=>az.indexUrl,findDocuments:async()=>[{sourceUrl:current.sourceDocument.sourceUrl}],readDataset:async()=>current}
  assert.equal((await runScheduled({...options,download:async()=>({contentHash:current.sourceDocument.documentHash})})).status,'NEEDS_PIPELINE') // Legacy v3 data must be revalidated by v4.
  assert.equal((await runScheduled({...options,download:async()=>({contentHash:'f'.repeat(64)})})).needsPipeline,true)
  assert.equal((await runScheduled({...options,readDataset:async()=>null})).status,'NEEDS_PIPELINE')
})
test('an unavailable event index falls back to the exact official season event scope',async()=>{
  const season=await readFile(new URL('./fixtures/fia-season-multi-event.html',import.meta.url),'utf8');let requests=0
  const result=await fetchFiaDocumentIndex({indexUrl:base.indexUrl,grandPrixId:base.id,season:2026,eventName:base.eventName,fetchFn:async()=>{if(!requests++)throw new Error('timeout');return new Response(season)}});assert.deepEqual(result,[]);assert.equal(requests,3)
})
const seasons=[{id:'old26',season:2026,startDate:'2026-03-06',endDate:'2026-03-08'},{id:'az26',season:2026,startDate:'2026-09-24',endDate:'2026-09-26'},{id:'future26',season:2026,startDate:'2026-10-02',endDate:'2026-10-04'},{id:'first27',season:2027,startDate:'2027-03-05',endDate:'2027-03-07'}]
test('season default chooses the supported current year, otherwise latest supported',()=>{
  assert.deepEqual(supportedSeasons(seasons),[2027,2026]);assert.equal(defaultSeason(seasons,new Date('2026-06-01')),2026);assert.equal(defaultSeason(seasons,new Date('2027-06-01')),2027);assert.equal(defaultSeason(seasons,new Date('2028-06-01')),2027)
})
test('year filtering and historical deep links never mix 2026/2027',()=>{
  assert.deepEqual(seasonEvents(seasons,2027).map(e=>e.id),['first27']);assert.equal(selectSeasonGrandPrix(seasons,new Set(['az26']),2026,'old26',new Date('2027-06-01')),'old26');assert.equal(selectSeasonGrandPrix(seasons,new Set(['az26']),2027,'old26'),'first27')
})
test('latest published is per season and independent of the upcoming event; empty year has context',()=>{
  const ids=new Set(['old26','az26']);assert.equal(selectSeasonGrandPrix(seasons,ids,2026),'az26');assert.equal(selectSeasonGrandPrix(seasons,ids,2027),'first27');ids.add('future26');assert.equal(selectSeasonGrandPrix(seasons,ids,2026),'future26')
})
test('i18n counters handle 0, 1, 8 without zero padding in every locale',()=>{
  assert.equal(garageUpdateCount('es',0),'SIN ACTUALIZACIONES');assert.equal(garageUpdateCount('es',1),'1 ACTUALIZACIÓN');assert.equal(garageUpdateCount('es',8),'8 ACTUALIZACIONES')
  for(const locale of ['es','en','it','pt','fr','de'])assert.doesNotMatch(garageUpdateCount(locale,8),/^08/)
})
test('published counts include every factual row regardless of 3D flags',()=>{
  const rows=[true,false,null].map((visualizable,i)=>({teamId:'mclaren',validationState:'published',visualizable,componentId:i?'unknown':null,highlightable:false}))
  rows.push({teamId:'mclaren',validationState:'manual_review'});assert.deepEqual(publishedUpdateCounts(rows),{mclaren:3})
})
test('Azerbaijan 38 and Madrid 10 remain published, including Mercedes 3 and Red Bull 2',async()=>{
  const read=async id=>JSON.parse(await readFile(new URL(`../public/data/grands-prix/2026/${id}.json`,import.meta.url)))
  const az=await read('azerbaijan-2026'),madrid=await read('madrid-grand-prix-2026');assert.equal(az.updates.length,38);assert.equal(madrid.updates.length,10);assert.equal(publishedUpdateCounts(madrid.updates).mercedes,3);assert.equal(publishedUpdateCounts(madrid.updates)['red-bull-racing'],2)
})

test('latest published follows the verified dataset dates when a race is moved', () => {
  const moved = seasons.map(e => e.id === 'az26' ? { ...e, startDate: '2026-10-16', endDate: '2026-10-18' } : e)
  assert.equal(selectSeasonGrandPrix(moved, new Set(['az26', 'future26']), 2026), 'az26')
})

test('counter immediately excludes records from the previously selected GP/year', () => {
  const rows = [{ teamId: 'mclaren', validationState: 'published', grandPrixId: 'gp-2026' }, { teamId: 'mclaren', validationState: 'published', grandPrixId: 'gp-2027' }]
  assert.deepEqual(publishedUpdateCounts(rows, 'gp-2027'), { mclaren: 1 })
  assert.deepEqual(publishedUpdateCounts(rows, 'no-data-gp'), {})
})
