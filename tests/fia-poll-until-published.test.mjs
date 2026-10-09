import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { runScheduled } from '../ingestion/fia/scheduled.mjs'
import { watchDecision } from '../src/domain/calendar.mjs'
import { eventRegistry } from '../ingestion/fia/events.mjs'
import { resolveOfficialCalendar } from '../ingestion/fia/official-calendar.mjs'
const current = JSON.parse(await readFile(new URL('../public/data/grands-prix/2026/azerbaijan-2026.json',import.meta.url)))
const event = {...eventRegistry.find(e=>e.id==='azerbaijan-2026'),fp1:{utc:'2026-09-25T08:30:00Z',timeZone:'Asia/Baku'}}
const at = new Date(event.fp1.utc)
const noNetwork=()=>{throw Error('published GP must not contact FIA')}
test('verified publication stops before any index discovery or PDF download on repeated runs',async()=>{
 for(let i=0;i<2;i++){
  const result=await runScheduled({resolution:{event},at,preflight:true,readDataset:async()=>current,findIndex:noNetwork,findDocuments:noNetwork,pipeline:noNetwork})
  assert.equal(result.status,'ALREADY_PUBLISHED');assert.equal(result.needsPipeline,false)
  assert.equal(result.contentHash,current.sourceDocument.documentHash)
 }
})
test('invalid identity, hash, duplicates or incomplete publication cannot stop discovery',async()=>{
 for(const mutate of [
  d=>d.grandPrix.id='wrong',d=>d.grandPrix.endDate='2026-09-27',d=>d.sourceDocument.documentHash='bad',
  d=>d.updates.push(d.updates[0]),d=>d.validation.manualReview=1,d=>d.validation.recordsReceived++,
  d=>d.updates[0].contentHash='b'.repeat(64)
 ]){
  const dataset=structuredClone(current);mutate(dataset);let calls=0
  const result=await runScheduled({resolution:{event},at,preflight:true,readDataset:async()=>dataset,findIndex:async()=>{calls++;return event.indexUrl},findDocuments:async()=>[]})
  assert.equal(calls,1);assert.equal(result.status,'PENDING_DOCUMENT')
 }
})
test('missing document remains pending and retries next invocation; discovered doc enters pipeline',async()=>{
 let calls=0
 const options={resolution:{event},at,publish:true,readDataset:async()=>null,findIndex:async()=>event.indexUrl,findDocuments:async()=>{calls++;return calls===1?[]:[{documentId:'9',sourceUrl:'https://www.fia.com/doc.pdf'}]},pipeline:async(e,o)=>{assert.equal(e.documentId,'9');assert.equal(o.publish,true);return {status:'PROCESSED'}}}
 assert.equal((await runScheduled(options)).status,'PENDING_DOCUMENT')
 assert.equal((await runScheduled(options)).status,'PROCESSED')
 assert.equal(calls,2)
})
test('missed :17, odd UTC hour, long delays, early PDF and post-weekend all remain eligible',()=>{
 for(const timestamp of ['2026-09-22T08:30:00Z','2026-09-24T01:53:00Z','2026-09-25T15:15:33Z','2026-09-25T15:59:59Z','2026-09-27T23:47:00Z','2026-09-28T19:59:59Z']){
  assert.equal(watchDecision(event,new Date(timestamp)).relevant,true,timestamp)
 }
 assert.equal(watchDecision(event,new Date('2026-09-28T20:00:00Z')).relevant,false)
})
test('post-weekend resolution retains only the latest event and still verifies official dates',async()=>{
 const base=eventRegistry.find(e=>e.id==='bahrain-2026')
 const fixture=JSON.parse(await readFile(new URL('./fixtures/official-sepang-sessions.json',import.meta.url)))
 const fia='<div class="event-item active"><div class="day">04</div><div class="month">Oct</div><div class="event-name cell">'+base.eventName+'</div><div class="event-location">SEPANG</div></div>'
 const f1='<a href="/en/racing/2026/bahrain">ROUND 16 02 - 04 Oct</a>'
 const race='<script>self.__next_f.push('+JSON.stringify([1,'0:'+JSON.stringify({race:fixture.race})])+')</script>'
 const options={season:2026,at:new Date('2026-10-05T10:47:00Z'),fetchFn:async url=>new Response(url.includes('fia.com')?fia:url.endsWith('/2026')?f1:race)}
 const result=await resolveOfficialCalendar([base],options)
 assert.equal(result.event.id,base.id);assert.equal(result.relevant,true)
 const expired=await resolveOfficialCalendar([base],{...options,at:new Date('2026-10-08T00:00:00Z')})
 assert.equal(expired.event,null)
})
