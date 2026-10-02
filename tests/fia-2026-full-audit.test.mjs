import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {gunzipSync} from 'node:zlib'
import {comparePublishedRows} from '../ingestion/fia/audit-comparison.mjs'
import {reconstructPresentation,parserVersion} from '../ingestion/fia/reconstruct.mjs'
import {parsePresentationText,inspectPresentationPage} from '../ingestion/fia/parser.mjs'
import {normalizeTeamHeading} from '../ingestion/fia/normalizer.mjs'
import {validateUpdate,findDuplicateRecordIds} from '../ingestion/fia/validator.mjs'
import {isPublishedDatasetCurrent,publicationDecision} from '../ingestion/fia/publication.mjs'
import {localizeFiaUpdate} from '../src/services/fia/localization.mjs'
import {selectLatestPublishedGrandPrixId} from '../src/services/fia/latest-published.mjs'
import {selectPublishedGarageGrandPrix} from '../src/features/garage/presentation.mjs'
import {eventRegistry2026} from '../ingestion/fia/events.mjs'

// Real PDF text runs and painted borders, captured from fresh official downloads.
const fixtures=JSON.parse(gunzipSync(await readFile(new URL('./fixtures/fia-2026-official-layouts.json.gz',import.meta.url))))
const audit=JSON.parse(await readFile(new URL('../data/fia-audit/2026.json',import.meta.url)))
const expected={
 'australia-2026':43,'austria-2026':41,'azerbaijan-2026':38,'bahrain-2026':14,
 'barcelona-catalunya-2026':18,'belgian-2026':21,'british-2026':9,'canada-2026':39,
 'china-2026':7,'dutch-2026':23,'hungarian-2026':37,'italian-grand-prix-2026':26,
 'japan-2026':16,'madrid-grand-prix-2026':10,'miami-2026':58,'monaco-2026':31,
}
const context=f=>({documentId:f.document.id,season:2026,grandPrixId:f.grandPrix.id,sourceUrl:f.document.sourceUrl,sourceDocument:f.document.title,contentHash:f.document.contentHash,parserVersion})
const plans=new Map(fixtures.map(f=>[f.grandPrix.id,reconstructPresentation(f.extraction,f.document,f.grandPrix)]))

test('all sixteen official PDFs reconcile factual rows, explicit discards and per-team counts',()=>{
 assert.equal(fixtures.length,16)
 assert.deepEqual(audit.totals,{detected:431,published:427,manualReview:4,discardedEmptyTemplates:2})
 for(const f of fixtures){
  const p=plans.get(f.grandPrix.id),event=audit.events.find(e=>e.grandPrixId===f.grandPrix.id)
  const detected=p.raw.pageAudit.reduce((n,page)=>n+page.rowsDetected,0)-p.parsed.discarded.length+p.manualReview.filter(r=>r.reason==='image_table_requires_transcription_validation').length
  assert.equal(detected,expected[f.grandPrix.id],f.grandPrix.id)
  assert.equal(detected,p.dataset.updates.length+p.manualReview.length)
  assert.equal(event.documentHash,f.document.contentHash)
  assert.equal(event.teams.length,11)
  for(const team of event.teams){
   assert.equal(team.published,p.dataset.updates.filter(r=>r.teamId===team.teamId).length)
   assert.equal(team.manualReview,p.manualReview.filter(r=>r.teamId===team.teamId).length)
   assert.equal(team.fiaRows,team.published+team.manualReview)
  }
 }
})

for(const f of fixtures){
 test(`${f.grandPrix.id}: second official reconstruction is UNCHANGED; no duplicate GP/team rows`,async()=>{
  const p=plans.get(f.grandPrix.id)
  const dataset=JSON.parse(await readFile(new URL('../public/data/grands-prix/2026/'+f.file,import.meta.url)))
  assert.equal(isPublishedDatasetCurrent(dataset,p.dataset,f.document.contentHash,parserVersion),true)
  assert.equal(new Set(p.dataset.updates.map(r=>r.id)).size,p.dataset.updates.length)
  assert.deepEqual(findDuplicateRecordIds(p.dataset.updates),[])
  assert.equal(isPublishedDatasetCurrent(dataset,p.dataset,'f'.repeat(64),parserVersion),false)
  for(const r of p.dataset.updates){
   assert.equal(normalizeTeamHeading(r.sourceTeamHeading),r.teamId,r.id)
   const headingPage=f.extraction.pages.find(page=>page.pageNumber===r.sourceHeadingPage)
   assert.equal(inspectPresentationPage(headingPage).sourceTeamHeading,r.sourceTeamHeading,r.id)
   if(r.sourceHeadingPage!==r.sourcePage)assert.equal(r.sourceReview.documentHash,f.document.contentHash)
   assert.deepEqual(validateUpdate(r,[f.grandPrix.id]),{valid:true,errors:[]})
   assert.equal(r.sourceUrl,f.document.sourceUrl)
   assert.equal(r.sourceText,[r.componentName,r.primaryReason,r.geometricDifference,r.briefDescription].filter(Boolean).join(' | '))
   const es=localizeFiaUpdate(r,'es')
   assert.equal(es.complete,true,r.id)
   assert.doesNotMatch(es.summary,/Traducción al español pendiente/)
   for(const field of ['componentName','primaryReason','geometricDifference','briefDescription'])assert.ok(es[field],r.id+': '+field)
   if(!r.componentId)assert.equal(r.visualizable,false)
  }
 })
}

test('Bahrain cascade development belongs to Ferrari, never Red Bull; Red Bull has Floor Board',()=>{
 const rows=plans.get('bahrain-2026').dataset.updates
 const cascade=rows.filter(r=>/Diffuser outboard winglet cascade element development/i.test(r.geometricDifference+' '+r.briefDescription))
 assert.equal(cascade.length,1)
 assert.equal(cascade[0].teamId,'ferrari')
 assert.equal(normalizeTeamHeading(cascade[0].sourceTeamHeading),'ferrari')
 assert.equal(cascade[0].sourcePage,8)
 assert.deepEqual(rows.filter(r=>r.teamId==='red-bull-racing').map(r=>r.componentName),['Floor Board'])
})

test('Dutch Alpine has exactly eight official components with explicitly reviewed continuation',()=>{
 const f=fixtures.find(f=>f.grandPrix.id==='dutch-2026'),p=plans.get('dutch-2026')
 assert.deepEqual(p.dataset.updates.filter(r=>r.teamId==='alpine').map(r=>r.componentName),['Floor Body','Floor Board','Floor Edge','Diffuser','Sidepod/Coke','Rear Corner','Rear impact structure','Rear Wing'])
 assert.equal(p.raw.records.filter(r=>r.teamId==='alpine').length,6)
 assert.deepEqual(p.raw.rejected.filter(r=>r.sourcePage===17).map(r=>r.sourceRowNumber),[7,8])
 const changed=reconstructPresentation(f.extraction,{...f.document,contentHash:'f'.repeat(64)},f.grandPrix)
 assert.equal(changed.parsed.records.filter(r=>r.teamId==='alpine').length,6)
 assert.equal(changed.manualReview.filter(r=>r.sourcePage===17).length,2)
})

test('unrecognised explicit heading is manual_review even after a recognised Red Bull page',()=>{
 const f=fixtures.find(f=>f.grandPrix.id==='bahrain-2026'),extraction=structuredClone(f.extraction)
 const page=extraction.pages.find(p=>p.pageNumber===8)
 const titleY=page.items.find(i=>/Car Presentation/.test(i.text)).y
 const tableY=Math.max(...page.tableLines.vertical.map(l=>l.y2))
 page.items=page.items.filter(i=>!(i.y<titleY-2&&i.y>tableY+2))
 page.items.push({text:'Unknown Works Team',x:300,y:(titleY+tableY)/2,width:150,height:12})
 const parsed=parsePresentationText(extraction,context(f))
 assert.equal(parsed.records.filter(r=>r.sourcePage===8).length,0)
 const rejected=parsed.rejected.filter(r=>r.sourcePage===8)
 assert.equal(rejected.length,1)
 assert.equal(rejected[0].reason,'unmapped_team')
 assert.equal(rejected[0].sourceTeamHeading,'Unknown Works Team')
 assert.ok(rejected[0].sourceText.includes('cascade'))
 const real=plans.get('bahrain-2026').dataset.updates.find(r=>r.teamId==='ferrari')
 assert.equal(validateUpdate({...real,teamId:'red-bull-racing'},['bahrain-2026']).valid,false)
})

test('untranslated new source cannot be published; absent 3D mapping still can',()=>{
 const r=plans.get('bahrain-2026').dataset.updates[0]
 const options={grandPrixIds:['bahrain-2026'],season:2026}
 assert.equal(publicationDecision({...r,componentId:null,visualizable:false,validationState:'validated'},options).publishable,true)
 const changed={...r,briefDescription:'New unreviewed technical description.',validationState:'validated'}
 assert.equal(publicationDecision(changed,options).publishable,false)
})

test('latest-published and a fresh Garage load select Bahrain after full reconstruction',()=>{
 const ids=new Set(fixtures.map(f=>f.grandPrix.id))
 assert.equal(selectLatestPublishedGrandPrixId(eventRegistry2026,ids),'bahrain-2026')
 assert.equal(selectPublishedGarageGrandPrix(eventRegistry2026,ids,2026),'bahrain-2026')
})

test('source comparison identifies exact wrong teams and preserves unresolved old text as evidence',()=>{
 const row=plans.get('bahrain-2026').dataset.updates.find(r=>r.teamId==='ferrari')
 const previous=[{...row,id:'old-wrong',teamId:'red-bull-racing'},{...row,id:'old-unresolved',sourceText:'truncated unknown text'}]
 const comparison=comparePublishedRows(previous,[row])
 assert.deepEqual(comparison.wrongTeamAssignments.map(m=>[m.previousTeamId,m.sourceMatches[0].teamId]),[['red-bull-racing','ferrari']])
 assert.deepEqual(comparison.unmatchablePreviousRows.map(m=>m.previousId),['old-unresolved'])
 assert.equal(comparison.missingOrMalformedRows.length,1)
 const recorded=audit.events.find(e=>e.grandPrixId==='bahrain-2026').sourceComparison
 assert.ok(recorded.wrongTeamAssignments.some(m=>m.previousTeamId==='red-bull-racing'&&m.sourceMatches[0].teamId==='ferrari'))
})

test('cross-page attribution requires review bound to the current PDF, and missing cells remain manual',()=>{
 const row=plans.get('dutch-2026').dataset.updates.find(r=>r.teamId==='alpine'&&r.sourcePage===17)
 assert.equal(validateUpdate({...row,sourceReview:{}},['dutch-2026']).valid,false)
 assert.equal(validateUpdate({...row,sourceReview:{...row.sourceReview,documentHash:'f'.repeat(64)}},['dutch-2026']).valid,false)
 assert.equal(validateUpdate({...row,primaryReason:null},['dutch-2026']).valid,false)
 assert.equal(validateUpdate({...row,geometricDifference:null},['dutch-2026']).valid,false)
})
