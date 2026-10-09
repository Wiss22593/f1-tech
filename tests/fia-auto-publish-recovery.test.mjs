import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { officialRequest } from '../ingestion/fia/request.mjs'
import { resolveOfficialCalendar, validateCalendarSnapshot } from '../ingestion/fia/official-calendar.mjs'
import { eventRegistry } from '../ingestion/fia/events.mjs'
import { resolveFiaEventIndex, fetchFiaDocumentIndex } from '../ingestion/fia/finder.mjs'
import { runScheduled } from '../ingestion/fia/scheduled.mjs'
const base = eventRegistry.find(e => e.id === 'bahrain-2026')
const fixture = JSON.parse(await readFile(new URL('./fixtures/official-sepang-sessions.json', import.meta.url)))
const fiaUrl = 'https://www.fia.com/events/fia-formula-one-world-championship/season-2026/2026-fia-formula-one-world-championship'
const at = new Date('2026-10-02T04:47:00Z')
const snapshot = () => ({schemaVersion:1,season:2026,sourceUrl:fiaUrl,retrievedAt:'2026-10-01T00:00:00Z',expiresAt:'2026-10-10T00:00:00Z',sha256:'a'.repeat(64),events:[{eventName:base.eventName,circuit:'SEPANG',endDate:'2026-10-04',status:'scheduled'}]})
const raceHtml = `<script>self.__next_f.push(${JSON.stringify([1,'0:'+JSON.stringify({race:fixture.race})])})</script>`
const f1Html = '<a href="/en/racing/2026/bahrain">ROUND 16 02 - 04 Oct</a>'
const resolveBlocked = options => resolveOfficialCalendar([base],{season:2026,at,snapshotLoader:async()=>snapshot(),fetchFn:async url=> url===fiaUrl ? new Response('',{status:403}) : new Response(url.endsWith('/2026')?f1Html:raceHtml),...options})
test('403 uses reviewed FIA snapshot plus live F1 calendar and live FP1',async()=>{
 const result=await resolveBlocked();assert.equal(result.relevant,true);assert.equal(result.event.id,base.id);assert.equal(result.event.fp1.utc,'2026-10-02T04:30:00.000Z');assert.equal(result.diagnostics.some(d=>d.status==='OFFICIAL_CALENDAR_FALLBACK'),true)
})
test('expired, future-reviewed, wrong-season, malformed snapshots fail closed',async()=>{
 for(const patch of [{expiresAt:at.toISOString()},{retrievedAt:'2026-10-03T00:00:00Z'},{season:2027},{sha256:'no'},{events:[]}]) assert.throws(()=>validateCalendarSnapshot({...snapshot(),...patch},2026,at,fiaUrl),/SNAPSHOT/)
 await assert.rejects(resolveBlocked({snapshotLoader:async()=>({...snapshot(),expiresAt:at.toISOString()})}),/SNAPSHOT/)
})
test('cached date conflicts and live reinstatements require review',async()=>{
 for(const patch of [{endDate:'2026-10-05'},{status:'cancelled'}]) {
  const s=snapshot();Object.assign(s.events[0],patch)
  assert.equal((await resolveBlocked({snapshotLoader:async()=>s})).status,'MANUAL_REVIEW')
 }
})
test('snapshot cannot replace missing live F1 or missing official FP1',async()=>{
 await assert.rejects(resolveBlocked({fetchFn:async()=>new Response('',{status:403})}),/403/)
 const race=structuredClone(fixture.race);race.meetingSessions=[]
 await assert.rejects(resolveBlocked({fetchFn:async url=>url===fiaUrl?new Response('',{status:403}):new Response(url.endsWith('/2026')?f1Html:`<script>self.__next_f.push(${JSON.stringify([1,'0:'+JSON.stringify({race})])})</script>`)}),/FP1/)
})
test('retry transient failures with bounded exponential backoff and fresh signals',async()=>{
 let n=0;const waits=[],signals=[]
 const response=await officialRequest(fiaUrl,{}, {fetchFn:async(_u,o)=>{signals.push(o.signal);return new Response('',{status:++n<3?503:200})},sleep:async ms=>waits.push(ms),log:()=>{}})
 assert.equal(response.status,200);assert.deepEqual(waits,[500,1000]);assert.equal(new Set(signals).size,3)
 n=0;await officialRequest(fiaUrl,{}, {fetchFn:async()=>new Response('',{status:++n?403:200}),sleep:()=>{throw new Error('no retry')},log:()=>{}});assert.equal(n,1)
 await assert.rejects(officialRequest('https://example.com',{},{}),/Non-official/)
})
test('retry network failure and respect long Retry-After; never retry final redirect validation',async()=>{
 let n=0;const waits=[]
 await officialRequest(fiaUrl,{}, {fetchFn:async()=>{if(!n++)throw new Error('network');return new Response('')},sleep:async ms=>waits.push(ms),log:()=>{}});assert.deepEqual(waits,[500])
 n=0;waits.length=0
 await officialRequest(fiaUrl,{}, {fetchFn:async()=>new Response('',{status:++n<2?429:200,headers:{'retry-after':'999'}}),sleep:async ms=>waits.push(ms),log:()=>{}});assert.deepEqual(waits,[]);assert.equal(n,1)
 await assert.rejects(officialRequest(fiaUrl,{}, {fetchFn:async()=>({url:'https://example.com',status:200}),log:()=>{}}),/Non-official response/)
})
test('403 on exact season index uses advertised official event link from generic route',async()=>{
 const seasonUrl='https://www.fia.com/documents/championships/fia-formula-one-world-championship-14/season/season-2026-2072'
 const path=seasonUrl+'/event/Bahrain%20Grand%20Prix';const calls=[]
 const result=await resolveFiaEventIndex({...base,indexUrl:null},{fetchFn:async url=>{calls.push(url);return url===seasonUrl?new Response('',{status:403}):new Response(`<option value="${path}">Bahrain Grand Prix</option>`)}})
 assert.equal(result,path);assert.equal(calls[1],seasonUrl.replace('/season-2026-2072',''))
})
test('blocked event and season indexes discover published PDF from scoped generic official index',async()=>{
 const index='https://www.fia.com/documents/championships/fia-formula-one-world-championship-14/season/season-2026-2072/event/Bahrain%20Grand%20Prix'
 const html='<div class="event-title">Italian Grand Prix</div><a href="/other.pdf">Doc 1 - Car Presentation Submissions</a><div class="event-title">Bahrain Grand Prix</div><a href="/2026_correct.pdf">Doc 2 - Car Presentation Submissions</a>'
 const result=await fetchFiaDocumentIndex({indexUrl:index,grandPrixId:base.id,eventName:base.eventName,season:2026,fetchFn:async url=>url.endsWith('/season')?new Response(html):new Response('',{status:403})})
 assert.equal(result.length,1);assert.equal(result[0].sourceUrl,'https://www.fia.com/2026_correct.pdf')
})
test('production scheduling reports a blocked publication gate instead of silent success',async()=>{
 const event={...base,fp1:{utc:'2026-10-02T04:30:00Z',timeZone:'Asia/Kuala_Lumpur'}}
 await assert.rejects(runScheduled({resolution:{event},at,publish:true,findIndex:async()=>base.indexUrl,findDocuments:async()=>[{sourceUrl:'https://www.fia.com/doc.pdf'}],readDataset:async()=>null,pipeline:async()=>({status:'MANUAL_REVIEW_ONLY'})}),/PUBLICATION_BLOCKED_MANUAL_REVIEW/)
})

test('generic index without event options is usable only with the exact event block',async()=>{
 const result=await resolveFiaEventIndex({...base,indexUrl:null},{fetchFn:async url=>url.endsWith('/season')?new Response('<div class="event-title">Bahrain Grand Prix</div><a href="/2026_correct.pdf">Doc 2 - Car Presentation Submissions</a>'):new Response('',{status:403})})
 assert.equal(result,'https://www.fia.com/documents/championships/fia-formula-one-world-championship-14/season')
})
test('full dry-run invokes the same pipeline without public writing; conflicting flags reject',async()=>{
 const event={...base,fp1:{utc:'2026-10-02T04:30:00Z',timeZone:'Asia/Kuala_Lumpur'}}
 let options
 const result=await runScheduled({resolution:{event},at,dryRun:true,findIndex:async()=>base.indexUrl,findDocuments:async()=>[{sourceUrl:'https://www.fia.com/doc.pdf'}],readDataset:async()=>null,pipeline:async(_event,o)=>{options=o;return {status:'MANUAL_REVIEW_ONLY'}}})
 assert.deepEqual(options,{publish:false});assert.equal(result.status,'MANUAL_REVIEW_ONLY')
 await assert.rejects(runScheduled({resolution:{event},at,dryRun:true,publish:true}),/cannot publish/)
})

test('generic season route rejects the same named GP from another year',async()=>{
 const url='https://www.fia.com/documents/championships/fia-formula-one-world-championship-14/season'
 const html='<div class="event-title">Bahrain Grand Prix</div><a href="/2025_wrong.pdf">Doc 2 - Car Presentation Submissions</a>'
 const result=await fetchFiaDocumentIndex({indexUrl:url,grandPrixId:base.id,eventName:base.eventName,season:2026,fetchFn:async()=>new Response(html)})
 assert.deepEqual(result,[])
})

test('schedule and dispatch both check every invocation during verified catch-up',async()=>{
 const at=new Date('2026-10-02T10:47:00Z')
 const scheduled=await resolveBlocked({at})
 const dispatched=await resolveBlocked({at,trigger:'workflow_dispatch'})
 assert.equal(scheduled.phase,'CATCH_UP');assert.equal(scheduled.relevant,true)
 assert.equal(dispatched.relevant,true);assert.equal(dispatched.trigger,'workflow_dispatch')
 const event=dispatched.event
 const options={resolution:dispatched,at,publish:true,findIndex:async()=>base.indexUrl,findDocuments:async()=>[{sourceUrl:'https://www.fia.com/doc.pdf'}],readDataset:async()=>null,pipeline:async()=>({status:'PROCESSED'})}
 assert.equal((await runScheduled(options)).status,'PROCESSED')
 assert.equal((await runScheduled({...options,resolution:scheduled})).status,'PROCESSED')
 assert.equal((await runScheduled({...options,at:new Date('2026-10-07T10:47:00Z')})).status,'SKIP_OUTSIDE_WINDOW')
})
