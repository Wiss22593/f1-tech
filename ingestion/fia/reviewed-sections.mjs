import reviews from '../../data/fia-reviewed-sections/2026.json' with { type: 'json' }
import { createHash } from 'node:crypto'
import { createRecord, inspectPresentationPage } from './parser.mjs'
import { normalizeTeamHeading } from './normalizer.mjs'
const fields=['componentName','primaryReason','geometricDifference','briefDescription']
export const sourceFieldsHash = record => createHash('sha256').update(JSON.stringify(fields.map(field=>record[field]??null))).digest('hex')
const sourceText = record => fields.map(f=>record[f]).filter(Boolean).join(' | ')
/** Apply explicit, visually reviewed evidence; this never guesses an earlier page's team. */
export function applyReviewedSections(parsed, extraction, context, catalogue=reviews) {
  const records=parsed.records.map(record=>({...record})),rejected=[...parsed.rejected],applied=[]
  for(const review of catalogue.filter(r=>r.grandPrixId===context.grandPrixId&&r.documentHash===context.contentHash&&r.sourceUrl===context.sourceUrl)) {
    const heading=inspectPresentationPage(extraction.pages.find(p=>p.pageNumber===review.sourceHeadingPage)??{items:[]})
    if(heading.sourceTeamHeading!==review.sourceTeamHeading||normalizeTeamHeading(review.sourceTeamHeading)!==review.teamId)continue
    if(review.kind==='continuation') {
      for(const approved of review.rows) {
        const index=rejected.findIndex(r=>r.sourcePage===review.sourcePage&&r.sourceRowNumber===approved.sourceRowNumber&&r.reason==='unmapped_team'&&r.fields&&sourceFieldsHash(r.fields)===approved.fieldsHash)
        if(index<0)continue
        const row=rejected[index]
        const result=createRecord({...row.fields,sourceTeamHeading:review.sourceTeamHeading,sourceHeadingPage:review.sourceHeadingPage},context,review.teamId,approved.sourceRowNumber)
        result.record.sourceReview={method:review.reviewMethod,reviewedAt:review.reviewedAt,documentHash:review.documentHash}
        records.push(result.record);rejected.splice(index,1);applied.push({sourcePage:review.sourcePage,sourceRowNumber:approved.sourceRowNumber,teamId:review.teamId})
      }
    } else if(review.kind==='cell_continuation') {
      const record=records.find(r=>r.sourcePage===review.sourceHeadingPage&&r.sourceRowNumber===review.targetRowNumber&&r.teamId===review.teamId&&sourceFieldsHash(r)===review.targetFieldsHash)
      const page=extraction.pages.find(p=>p.pageNumber===review.sourcePage)
      if(!record||!page||!review.text.split(/\s+/).every(word=>page.items.some(i=>i.text.includes(word))))continue
      record[review.field]=[record[review.field],review.text].join(' ')
      record.description=record.briefDescription;record.sourceText=sourceText(record)
      record.sourcePages=[record.sourcePage,review.sourcePage]
      record.sourceReview={method:review.reviewMethod,reviewedAt:review.reviewedAt,documentHash:review.documentHash}
      applied.push({sourcePage:review.sourcePage,targetRowNumber:review.targetRowNumber,teamId:review.teamId})
    } else if(review.kind==='image_table_inventory') {
      for(const row of review.rows)rejected.push({...row,sourceUrl:review.sourceUrl,sourcePage:review.sourcePage,sourceHeadingPage:review.sourceHeadingPage,sourceTeamHeading:review.sourceTeamHeading,teamId:review.teamId,sourceText:sourceText(row),reason:'image_table_requires_transcription_validation',reviewMethod:review.reviewMethod})
    }
  }
  records.sort((a,b)=>a.sourcePage-b.sourcePage||a.sourceRowNumber-b.sourceRowNumber)
  return {...parsed,records,rejected,appliedReviews:applied}
}
