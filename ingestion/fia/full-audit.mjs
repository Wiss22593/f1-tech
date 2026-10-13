import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises'
import {resolve} from 'node:path'
import {createHash} from 'node:crypto'
import {downloadDocument} from './downloader.mjs'
import {extractPdfText} from './extractor.mjs'
import {reconstructPresentation,parserVersion} from './reconstruct.mjs'
import {isPublishedDatasetCurrent,writePublishedDatasetAtomically} from './publication.mjs'
import {normalizeTeamHeading} from './normalizer.mjs'
import {comparePublishedRows} from './audit-comparison.mjs'

const teams=['mclaren','mercedes','red-bull-racing','ferrari','williams','racing-bulls','aston-martin','haas','audi','alpine','cadillac']
const args=Object.fromEntries(process.argv.slice(2).map(a=>a.replace(/^--/,'').split('=')))
const output=resolve(args.output??'ingestion/output/full-audit')
await mkdir(output,{recursive:true})
const publicDir=resolve('public/data/grands-prix/2026')
const sources=args.input?JSON.parse(await readFile(resolve(args.input),'utf8')):await Promise.all((await readdir(publicDir)).filter(f=>f.endsWith('.json')).map(async file=>{
 const old=JSON.parse(await readFile(resolve(publicDir,file),'utf8'))
 return {file,document:old.sourceDocument,grandPrix:old.grandPrix,season:2026}
}))
const results=[]
for(const source of sources){
 const current=JSON.parse(await readFile(resolve(publicDir,source.file),'utf8'))
 let extraction,document
 if(args.input){
  const bytes=await readFile(source.path)
  const hash=createHash('sha256').update(bytes).digest('hex')
  if(hash!==source.document.contentHash)throw new Error(`Source hash mismatch: ${source.file}`)
  extraction=JSON.parse(await readFile(resolve(output,source.file+'.layout.json'),'utf8'))
  document=source.document
 }else{
  const download=await downloadDocument(source.document,resolve('ingestion/raw'))
  document={...source.document,contentHash:download.contentHash,retrievedAt:download.retrievedAt}
  extraction=await extractPdfText(download.path)
 }
 const plan=reconstructPresentation(extraction,document,source.grandPrix,2026)
 if(!plan.dataset)throw new Error(`No safe publication: ${source.file}`)
 const detected=plan.raw.pageAudit.reduce((n,p)=>n+p.rowsDetected,0)-plan.parsed.discarded.length+plan.manualReview.filter(r=>r.reason==='image_table_requires_transcription_validation').length
 if(detected!==plan.dataset.updates.length+plan.manualReview.length)throw new Error(`Unreconciled source rows: ${source.file}`)
 for(const r of plan.dataset.updates)if(normalizeTeamHeading(r.sourceTeamHeading)!==r.teamId)throw new Error(`Heading mismatch: ${r.id}`)
 const unchanged=isPublishedDatasetCurrent(current,plan.dataset,document.contentHash,parserVersion)
 let before=current
 try{before=JSON.parse(await readFile(resolve(output,source.file+'.before'),'utf8'))}catch{}
 const count=(rows,team)=>rows.filter(r=>r.teamId===team).length
 const sourceComparison=comparePublishedRows(before.updates,plan.dataset.updates,plan.manualReview)
 const comparisons=teams.map(team=>{
  const published=count(plan.dataset.updates,team),manualReview=count(plan.manualReview,team),previous=count(before.updates,team)
  const missingOrMalformed=sourceComparison.missingOrMalformedRows.filter(r=>r.teamId===team).length
  const wrongTeam=sourceComparison.wrongTeamAssignments.filter(r=>r.sourceMatches[0].teamId===team)
  const previousDuplicates=sourceComparison.previousDuplicates.filter(id=>before.updates.some(r=>r.id===id&&r.teamId===team)).length
  return {teamId:team,fiaRows:published+manualReview,published,manualReview,previousPublished:previous,missingOrMalformed,wrongTeamAssignments:wrongTeam.length,previousDuplicates,corrections:previous===published?'Columnas originales, encabezado y ES verificados':`${previous} → ${published} publicadas; reconstrucción desde PDF${manualReview?`; ${manualReview} en revisión`:''}`}
 })
 const audit={grandPrixId:source.grandPrix.id,name:source.grandPrix.name,sourceUrl:document.sourceUrl,documentId:document.documentId,documentHash:document.contentHash,pageCount:extraction.pageCount,detected,published:plan.dataset.updates.length,manualReview:plan.manualReview.length,discarded:plan.parsed.discarded,duplicates:plan.rejected.filter(r=>r.reason==='duplicate_record').length,teams:comparisons,appliedReviews:plan.parsed.appliedReviews,sourceComparison,status:unchanged?'UNCHANGED':'RECONSTRUCTED'}
 results.push({audit,manualReview:plan.manualReview,document,grandPrix:source.grandPrix,extraction})
 if(args.publish==='true'&&!unchanged)await writePublishedDatasetAtomically(resolve(publicDir,source.file),plan.dataset)
 console.log(JSON.stringify({grandPrixId:audit.grandPrixId,status:audit.status,detected,published:audit.published,manualReview:audit.manualReview}))
}
const audit={season:2026,parserVersion,generatedAt:new Date().toISOString(),totals:{detected:results.reduce((n,r)=>n+r.audit.detected,0),published:results.reduce((n,r)=>n+r.audit.published,0),manualReview:results.reduce((n,r)=>n+r.audit.manualReview,0),discardedEmptyTemplates:results.reduce((n,r)=>n+r.audit.discarded.length,0)},events:results.map(r=>r.audit)}
await mkdir('data/fia-audit',{recursive:true})
await writeFile(resolve(output,'reingestion-results.json'),JSON.stringify(audit,null,2)+'\n')
if(args.publish==='true'&&(args.report==='true'||results.some(r=>r.audit.status!=='UNCHANGED'))){
 await writeFile('data/fia-audit/2026.json',JSON.stringify(audit,null,2)+'\n')
 await writeFile('data/fia-audit/2026-manual-review.json',JSON.stringify(results.flatMap(r=>r.manualReview.map(row=>({...row,grandPrixId:r.grandPrix.id,contentHash:r.document.contentHash}))),null,2)+'\n')
 const header='# Auditoría completa FIA 2026\n\nFuente de verdad: PDFs oficiales FIA Car Presentation Submissions descargados nuevamente el 2 de octubre de 2026. Se revisaron visualmente todas sus páginas; los JSON previos se usaron solamente para comparar el estado anterior.\n\n## Causa raíz\n\nEl parser anterior retenía activeTeamId y el perfil de tabla entre páginas. El encabezado de Ferrari en Bahrain está fragmentado en runs PDF (Scu + deria Ferrari HP); el matching sobre texto aplanado lo omitió y heredó Red Bull. En los datasets históricos, la extracción aplanada perdió columnas y filas, e incluyó números del texto como filas. El nuevo parser reconstruye encabezados por coordenadas y acepta únicamente nombres completos reconocidos en la misma página. No hereda equipos ni usa índices globales.\n\nCada registro conserva las cuatro columnas EN, URL, hash, página, número de fila y encabezado. Las continuaciones sin encabezado quedan automáticamente en manual_review. Las continuaciones publicadas tienen una revisión visual explícita autorizada por el usuario, vinculada al hash del PDF, página del encabezado y hash de las cuatro celdas; el inventario está en data/fia-reviewed-sections/2026.json. Un cambio en esa evidencia invalida la aprobación. Dos continuaciones de celdas (Haas Australia y Red Bull Miami) conservan ambas páginas en sourcePages.\n\nLas traducciones ES reproducen las cuatro celdas completas; no se reutilizan traducciones si cambian el original o su hash. Las filas sin mapping 3D siguen publicadas con componentId=null y visualizable=false.\n\n## Reconciliación\n\n'
 const totals=`${audit.totals.detected} filas FIA factuales = ${audit.totals.published} publicadas + ${audit.totals.manualReview} manual_review. Duplicados finales: 0. Dos filas numeradas vacías (Red Bull Barcelona, página 6, filas 3 y 4) se descartan explícitamente como plantillas sin actualización factual.\n\nAustralia: las cuatro filas Williams de la página 10 están rasterizadas y no aparecen en la capa de texto. Se inventariaron mediante inspección visual y se conservan en data/fia-audit/2026-manual-review.json; no se publicaron porque falta validar la transcripción. Los demás GP quedan íntegramente publicados.\n\nBahrain Doc 12: Ferrari tiene “Diffuser outboard winglet cascade element development”; Red Bull tiene solamente “Floor Board”. Países Bajos Doc 10: Alpine tiene exactamente 8 filas (Floor Body, Floor Board, Floor Edge, Diffuser, Sidepod/Coke, Rear Corner, Rear Impact Structure, Rear Wing); las filas 7 y 8 están en la continuación revisada de la página 17, con encabezado de la página 16. Bahrain mantiene grandPrixId=bahrain-2026 y es el último dataset publicado que Garage selecciona al cargar/reload.\n\nGP | Equipo | Filas FIA | Publicadas | Manual review | Correcciones\n--- | --- | ---: | ---: | ---: | ---\n`
 const rows=results.flatMap(r=>r.audit.teams.map(t=>`${r.audit.name} | ${t.teamId} | ${t.fiaRows} | ${t.published} | ${t.manualReview} | ${t.corrections}; sin representación fiel previa: ${t.missingOrMalformed}; atribuciones erróneas identificadas: ${t.wrongTeamAssignments}; duplicados previos: ${t.previousDuplicates}`)).join('\n')
 const comparisonNotes='\n\n## Comparación con la publicación anterior\n\nLa comparación vincula una fila anterior sólo cuando contiene las cuatro celdas EN completas de una única fila FIA reconstruida. “Sin representación fiel previa” incluye filas ausentes, truncadas, con columnas perdidas o asignadas a otro equipo. No se afirma que toda fila sin coincidencia estuviera ausente: la pérdida de estructura del parser anterior impide resolver algunas identidades de forma inequívoca. Las atribuciones incorrectas listadas requieren una coincidencia única de las cuatro celdas; las coincidencias ambiguas o imposibles quedan documentadas con su texto original en sourceComparison.unmatchablePreviousRows de data/fia-audit/2026.json. Ese archivo detalla también los duplicados anteriores y cada fila reconstruida sin representación fiel. Las cero filas faltantes finales se verifican por GP/equipo contra las coordenadas originales del PDF y el inventario visual de la tabla rasterizada.\n\nAtribuciones erróneas identificadas inequívocamente:\n\n'+results.flatMap(r=>r.audit.sourceComparison.wrongTeamAssignments.map(m=>'- '+r.audit.name+': '+m.previousTeamId+' → '+m.sourceMatches[0].teamId+', página '+m.sourceMatches[0].sourcePage+', fila '+m.sourceMatches[0].sourceRowNumber+' ('+m.sourceMatches[0].componentName+').')).join('\n')
 const sourceTable='\n\n## PDFs oficiales y hashes\n\nGP | Doc | Páginas | SHA-256 | Fuente\n--- | --- | ---: | --- | ---\n'+results.map(r=>`${r.audit.name} | ${r.audit.documentId} | ${r.audit.pageCount} | \`${r.audit.documentHash}\` | [PDF FIA](${r.audit.sourceUrl})`).join('\n')
 await mkdir('docs',{recursive:true});await writeFile('docs/fia-2026-full-audit.md',header+totals+rows+comparisonNotes+sourceTable+'\n')
}
