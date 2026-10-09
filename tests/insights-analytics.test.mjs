import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { uniqueRecords, filterRecords, groupCounts, familyKey, reasonKey, typeKey, eventSeries } from '../src/features/insights/analytics.mjs'
const root=new URL('../public/data/grands-prix/2026/',import.meta.url)
const datasets=readdirSync(root).filter(f=>f.endsWith('.json')).map(f=>JSON.parse(readFileSync(new URL(f,root),'utf8')))
const records=uniqueRecords(datasets.flatMap(d=>d.updates))
test('FIA analytical partitions conserve the number of published rows',()=>{
 assert.ok(records.length>0)
 for(const key of [familyKey,reasonKey,typeKey,r=>r.teamId,r=>r.grandPrixId]) assert.equal(groupCounts(records,key).reduce((n,[,count])=>n+count,0),records.length)
})
test('Repeated rows and unpublished drafts never inflate analytics',()=>{
 assert.equal(uniqueRecords([...records,...records,{...records[0],id:'draft',validationState:'draft'}]).length,records.length)
})
test('Every combined filter matches direct published row selection',()=>{
 for(const r of records) {
  const expected=records.filter(x=>x.teamId===r.teamId&&x.grandPrixId===r.grandPrixId&&familyKey(x)===familyKey(r)&&reasonKey(x)===reasonKey(r)&&typeKey(x)===typeKey(r))
  assert.deepEqual(filterRecords(records,{teamId:r.teamId,grandPrixId:r.grandPrixId,family:familyKey(r),reason:reasonKey(r),type:typeKey(r)}),expected)
 }
 assert.equal(filterRecords(records,{grandPrixId:'singapore-2026'}).length,0)
})
test('Cumulative series conserve totals, chronology and team partitions',()=>{
 const registry=JSON.parse(readFileSync(new URL('../data/grands-prix/2026.json',import.meta.url),'utf8')).sort((a,b)=>a.startDate.localeCompare(b.startDate))
 const series=eventSeries(records,registry.map(g=>({id:g.grandPrixId})),[...new Set(records.map(r=>r.teamId))])
 assert.equal(series.reduce((total,s)=>total+s.values.at(-1).cumulative,0),records.length)
 for(const s of series) { let sum=0;for(const v of s.values){sum+=v.count;assert.equal(v.cumulative,sum)} }
})
test('Missing taxonomy is explicit and family counting never expands rows',()=>{
 const sample={...records[0],componentId:null,componentName:null,primaryReason:null}
 assert.equal(familyKey(sample),'__unspecified')
 assert.equal(reasonKey(sample),'__unspecified')
 assert.equal(typeKey(sample),'__unspecified')
 assert.equal(groupCounts([sample],familyKey)[0][1],1)
})
console.log(JSON.stringify({records:records.length,documents:new Set(records.map(r=>r.sourceUrl)).size,families:new Set(records.map(familyKey)).size,events:new Set(records.map(r=>r.grandPrixId)).size,teamCounts:Object.fromEntries(groupCounts(records,r=>r.teamId))}))
