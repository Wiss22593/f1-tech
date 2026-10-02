import {parsePresentationText} from './parser.mjs'
import {applyReviewedSections} from './reviewed-sections.mjs'
import {validateUpdate,findDuplicateRecordIds} from './validator.mjs'
import {createPublicationPlan} from './publication.mjs'
export const parserVersion='fia-table-v4'
/** One reconstruction path for normal ingestion, historical audit and idempotence checks. */
export function reconstructPresentation(extraction,document,grandPrix,season=2026) {
  const context={documentId:document.id,season,grandPrixId:grandPrix.id,sourceDocument:document.title,sourceUrl:document.sourceUrl,sourceLanguage:'en',contentHash:document.contentHash,parserVersion}
  const raw=parsePresentationText(extraction,context)
  const parsed=applyReviewedSections(raw,extraction,context)
  const duplicates=new Set(findDuplicateRecordIds(parsed.records)),rejected=[...parsed.rejected],validated=[]
  for(const record of parsed.records){
    const validation=validateUpdate(record,[grandPrix.id],season)
    if(duplicates.has(record.id))rejected.push({...record,reason:'duplicate_record'})
    else if(!validation.valid)rejected.push({...record,reason:validation.errors})
    else validated.push({...record,validationState:'validated'})
  }
  const publication=createPublicationPlan({document,records:validated,rejected,grandPrix,season,parserVersion})
  return {raw,parsed,validated,rejected,...publication}
}
