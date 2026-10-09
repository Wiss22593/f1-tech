export function uniqueRecords(records) {
 return [...new Map(records.filter(r=>r.validationState==='published').map(r=>[r.grandPrixId+':'+r.id,r])).values()]
}
export function familyKey(r) { return r.componentId || r.componentName || '__unspecified' }
export function reasonKey(r) { return r.primaryReason?.trim() || '__unspecified' }
export function typeKey(r) { return reasonKey(r).split(/\s+-\s+/)[0] }
export function filterRecords(records, filters) {
 return uniqueRecords(records).filter(r=>Object.entries(filters).every(([field,value])=>!value || (field==='family'?familyKey(r):field==='reason'?reasonKey(r):field==='type'?typeKey(r):r[field])===value))
}
export function groupCounts(records,key) {
 const counts=new Map()
 for(const r of records) { const label=key(r); counts.set(label,(counts.get(label)||0)+1) }
 return [...counts].sort((a,b)=>b[1]-a[1] || a[0].localeCompare(b[0]))
}
export function eventSeries(records,events,teamIds) {
 return teamIds.map(teamId=>{let cumulative=0;return {teamId,values:events.map(event=>{const count=records.filter(r=>r.teamId===teamId&&r.grandPrixId===event.id).length;cumulative+=count;return {eventId:event.id,count,cumulative}})}})
}
