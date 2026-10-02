import {findDuplicateRecordIds} from './validator.mjs'
const normalize = value => String(value??'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim()
const reference = row => ({teamId:row.teamId,sourcePage:row.sourcePage,sourceRowNumber:row.sourceRowNumber,componentName:row.componentName})
/** Compare old publication against freshly reconstructed source cells, never use it to infer a team. */
export function comparePublishedRows(previous,sourceRows,manualRows=[]) {
 const source=[...sourceRows,...manualRows.filter(r=>r.componentName)]
 const matches=previous.map(old=>{
  const text=normalize(old.sourceText)
  const candidates=source.filter(row=>['componentName','primaryReason','geometricDifference','briefDescription'].every(field=>row[field]&&text.includes(normalize(row[field]))))
  return {previousId:old.id,previousTeamId:old.teamId,previousSourceText:old.sourceText,sourceMatches:candidates.map(reference)}
 })
 const represented=new Set(matches.filter(m=>m.sourceMatches.length===1&&m.sourceMatches[0].teamId===m.previousTeamId).map(m=>JSON.stringify(m.sourceMatches[0])))
 return {
  previousDuplicates:findDuplicateRecordIds(previous),
  wrongTeamAssignments:matches.filter(m=>m.sourceMatches.length===1&&m.sourceMatches[0].teamId!==m.previousTeamId),
  missingOrMalformedRows:source.filter(row=>!represented.has(JSON.stringify(reference(row)))).map(reference),
  unmatchablePreviousRows:matches.filter(m=>m.sourceMatches.length!==1),
 }
}
