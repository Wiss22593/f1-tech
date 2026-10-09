import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile,mkdtemp,readdir,writeFile,mkdir } from 'node:fs/promises'
import { addAutomaticSpanish,protectTechnicalTerms } from '../ingestion/fia/translate-es.mjs'
import { checkTranslatedField,automaticTranslationErrors } from '../src/services/fia/translation-policy.mjs'
import { localizeFiaUpdate,fiaLocalizationSourceKey } from '../src/services/fia/localization.mjs'
import { createPublicationPlan,isPublishedDatasetCurrent,publicationDecision } from '../ingestion/fia/publication.mjs'
import { validateAutoPublishDataset } from '../ingestion/fia/auto-publish.mjs'
const original=JSON.parse(await readFile(new URL('../public/data/grands-prix/2026/azerbaijan-2026.json',import.meta.url)))
const fields=['componentName','primaryReason','geometricDifference','briefDescription']
const row=()=>{const r={...original.updates[0],id:'unit-future-text',parserVersion:'fia-table-v4',validationState:'validated',contentHash:'b'.repeat(64),componentName:'front-wing',componentId:'front-wing',teamId:'mercedes',sourcePage:1,sourceHeadingPage:1,sourceRowNumber:1,sourceTeamHeading:'Mercedes-AMG PETRONAS F1 Team',primaryReason:'Performance - Flow Conditioning',geometricDifference:'Revised cooling duct with 3 slots.',briefDescription:'The new duct improves cooling without changing the SM opening.',translations:{}};r.sourceText=fields.map(f=>r[f]).join(' | ');return r}
const factory=stats=>async()=>({translate:async text=>{stats.calls++;if(text.includes('3 slots'))return '[T0] de refrigeración revisado con 3 ranuras.';return 'El nuevo [T0] mejora la refrigeración sin cambiar la abertura SM.'},dispose:async()=>{stats.disposed=true}})
const enriched=async()=> (await addAutomaticSpanish([row()],{engineFactory:factory({calls:0}),useCache:false}))[0]
test('unseen technical text gets explicitly automatic Spanish without changing any FIA source field',async()=>{
 const r=row(),before=structuredClone(r);Object.freeze(r);const stats={calls:0}
 const [result]=await addAutomaticSpanish([r],{engineFactory:factory(stats),useCache:false})
 assert.deepEqual(r,before);for(const f of [...fields,'sourceText','sourceUrl','contentHash','id','teamId'])assert.equal(result[f],before[f])
 assert.equal(result.translations.es.method,'automatic');assert.equal(result.translations.es.reviewStatus,'unreviewed');assert.equal(stats.calls,2);assert.equal(stats.disposed,true)
 assert.equal(result.translations.es.fieldMethods.componentName,'reviewed_phrase');assert.equal(result.translations.es.fieldMethods.briefDescription,'machine')
 assert.equal(localizeFiaUpdate(result,'es').translationStatus,'automatic');assert.equal(localizeFiaUpdate(result,'es').complete,true)
 assert.equal(localizeFiaUpdate(result,'en').briefDescription,r.briefDescription)
 assert.deepEqual(automaticTranslationErrors(result,fiaLocalizationSourceKey(result)),[])
})
test('reviewed Spanish always remains reviewed and never starts the model',async()=>{
 const r=original.updates[0]
 assert.deepEqual(await addAutomaticSpanish([r],{engineFactory:()=>{throw new Error('must not load')},useCache:false}),[r])
 assert.equal(localizeFiaUpdate(r,'es').translationStatus,'reviewed')
})
test('stale original, incomplete Spanish, altered revision and a false reviewed flag fail publication',async()=>{
 const r=await enriched()
 for(const mutate of [x=>x.geometricDifference+=' New source.',x=>delete x.translations.es.briefDescription,x=>x.translations.es.provider.revision='0'.repeat(40),x=>x.translations.es.method='reviewed',x=>x.translations.es.reviewStatus='reviewed']){
  const altered=structuredClone(r);mutate(altered)
  assert.equal(publicationDecision(altered,{grandPrixIds:[r.grandPrixId],season:2026}).publishable,false)
 }
})
test('translation checks reject changed numbers, acronyms, negation, omissions and placeholders',()=>{
 for(const [a,b] of [['3 slots','4 ranuras'],['two elements','tres elementos'],['SM opening','abertura'],['without changing','con cambios'],['New duct','Conducto'],['Revised geometries','Placas'],['Original','[T0]']])assert.ok(checkTranslatedField(a,b).length,a)
 assert.deepEqual(checkTranslatedField('3.5 mm','3,5 mm'),[])
})
test('glossary is generic and rejects duplicated or omitted protected terminology',()=>{
 const p=protectTechnicalTerms('Revised front wing and duct.')
 assert.equal(p.text,'Revised [T0] and [T1].')
 assert.equal(p.restore('Revisado [T0] y [T1].'),'Revisado alerón delantero y conducto.')
 assert.throws(()=>p.restore('[T0] [T0] [T1]'),/TOKEN_CHANGED/)
 assert.throws(()=>p.restore('[T0]'),/TOKEN_CHANGED/)
})
test('translation cache is reusable, versioned, and rejects corrupt target bytes',async()=>{
 await mkdir('ingestion/output',{recursive:true});const dir=await mkdtemp('ingestion/output/translation-unit-'),stats={calls:0}
 const [first]=await addAutomaticSpanish([row()],{engineFactory:factory(stats),cacheDirectory:dir})
 assert.equal(stats.calls,2)
 const [second]=await addAutomaticSpanish([row()],{engineFactory:()=>{throw new Error('cache miss')},cacheDirectory:dir})
 assert.deepEqual(first,second)
 for(const f of await readdir(dir)){const p=dir+'/'+f;const j=JSON.parse(await readFile(p,'utf8'));j.target+=' corrupt';await writeFile(p,JSON.stringify(j))}
 const again={calls:0};await addAutomaticSpanish([row()],{engineFactory:factory(again),cacheDirectory:dir});assert.equal(again.calls,2)
})
test('model unavailable or invalid output aborts; no English-only publication fallback',async()=>{
 await assert.rejects(addAutomaticSpanish([row()],{engineFactory:async()=>{throw new Error('model offline')},useCache:false}),/model offline/)
 await assert.rejects(addAutomaticSpanish([row()],{engineFactory:async()=>({translate:async()=>''}),useCache:false}),/TOKEN_CHANGED|VALIDATION_FAILED/)
 assert.equal(publicationDecision(row(),{grandPrixIds:[row().grandPrixId],season:2026}).publishable,false)
})
test('automatic Spanish passes the same dataset validator and reruns remain idempotent',async()=>{
 const r=await enriched(),document={...original.sourceDocument,contentHash:r.contentHash}
 const plan=()=>createPublicationPlan({document,records:[r],grandPrix:original.grandPrix,season:2026,parserVersion:'fia-table-v4'})
 const a=plan().dataset,b=plan().dataset
 assert.equal(a.updates.length,1);assert.equal(validateAutoPublishDataset(a,'public/data/grands-prix/2026/azerbaijan-2026.json').valid,true)
 assert.equal(isPublishedDatasetCurrent(a,b,r.contentHash,'fia-table-v4'),true)
 const bad=structuredClone(a);bad.updates[0].translations.es.briefDescription='Texto sin procedencia ni datos.'
 assert.equal(validateAutoPublishDataset(bad,'public/data/grands-prix/2026/azerbaijan-2026.json').valid,false)
})
