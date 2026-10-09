import { normalizeComponent, normalizeTeamHeading } from './normalizer.mjs'

const entryStart = /(?:^|\s)(\d+)\s+(.+?)(?=\s+(?:Performance|Circuit specific|Reliability|Flow Conditioning)\b)/gi

const cleanCell = (value = '') => typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() || null : null
const slug = (value = '') => value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const joinCell = (items) => cleanCell([...items]
  .sort((a, b) => Math.abs(b.y - a.y) > 1.5 ? b.y - a.y : a.x - b.x)
  .map(({ text }) => text)
  .join(' '))

export function createRecord(fields, context, teamId, rowNumber) {
  const componentId = normalizeComponent(fields.componentName ?? '')
  const sourceText = cleanCell([fields.componentName, fields.primaryReason, fields.geometricDifference, fields.briefDescription].filter(Boolean).join(' | '))
  if (!teamId) return {
    rejected: {
      sourceUrl: context.sourceUrl ?? null, sourcePage: fields.page ?? null, sourceTeamHeading: fields.sourceTeamHeading ?? null, sourceRowNumber: Number(rowNumber), fields, teamDetected: teamId, rawComponentText: fields.componentName, sourceText,
      reason: 'unmapped_team', suggestedComponentIds: [],
    },
  }
  const componentKey = componentId ?? slug(fields.componentName ?? '')
  return {
    record: {
      id: `${context.documentId}-${teamId}-${componentKey}-${rowNumber}`, season: context.season, grandPrixId: context.grandPrixId, teamId, componentId, visualizable: Boolean(componentId),
      componentName: fields.componentName, primaryReason: fields.primaryReason, geometricDifference: fields.geometricDifference, briefDescription: fields.briefDescription,
      category: fields.primaryReason, source: 'FIA', sourceUrl: context.sourceUrl ?? null, sourceDocument: context.sourceDocument, sourceText,
      sourcePage: fields.page ?? null, sourceTeamHeading: fields.sourceTeamHeading ?? null, sourceHeadingPage: fields.sourceHeadingPage ?? fields.page ?? null, sourceRowNumber: Number(rowNumber),
      sourceLanguage: context.sourceLanguage ?? 'en', translations: {}, description: fields.briefDescription, area: null, objective: null,
      magnitude: null, technicalState: 'SUBMITTED', validationState: 'draft', publishedAt: null, contentHash: context.contentHash, parserConfidence: 'deterministic_table', parserVersion: context.parserVersion ?? 'fia-table-v4',
    },
  }
}

/** Reconstruct explicit heading lines, joining adjacent PDF text runs by geometry. */
export function pageTextLines(items) {
  const lines = []
  for (const item of [...items].sort((a,b) => b.y-a.y || a.x-b.x)) {
    let line = lines.find(line => Math.abs(line.y-item.y) < 1.5)
    if (!line) { line={y:item.y,items:[]}; lines.push(line) }
    line.items.push(item)
  }
  return lines.map(line => {
    const sorted=line.items.sort((a,b)=>a.x-b.x)
    return { y:line.y, text:sorted.map((item,i)=> (i && item.x-(sorted[i-1].x+(sorted[i-1].width??0))>1.5?' ':'')+item.text).join('').trim() }
  })
}
const uniqueCoordinates = values => [...values].sort((a,b)=>a-b).filter((x,i,a)=>!i || x-a[i-1]>1.5)

/** Detect rows from their own page's painted borders; never retain another page's team or columns. */
export function inspectPresentationPage(page) {
  const items=page.items??[], vertical=page.tableLines?.vertical??[], horizontal=page.tableLines?.horizontal??[]
  const componentHeader=items.find(({text})=>/^Updated(?: component)?$/i.test(text))
  const primaryHeader=items.find(({text})=>/^Primary reason\b/i.test(text))
  const geometricHeader=items.find(({text})=>/^Geometric differences\b/i.test(text))
  const briefHeader=items.find(({text})=>/^Brief description\b/i.test(text))
  const headers=[componentHeader,primaryHeader,geometricHeader,briefHeader]
  const hasHeaders=headers.every(Boolean)
  const tableTop = vertical.length ? Math.max(...vertical.map(v=>v.y2)) : hasHeaders ? Math.max(...headers.map(h=>h.y))+15 : Infinity
  const lines=pageTextLines(items)
  const title=lines.find(line=>/Car Presentation\s*[–-]/i.test(line.text))
  const headingLines=title?lines.filter(line=>line.y<title.y-2 && (Number.isFinite(tableTop)?line.y>tableTop+2:line.y>title.y-55)):[]
  const heading=headingLines.map(line=>line.text).join(' ') || null
  const teamId=normalizeTeamHeading(heading??'')
  const leftBorders=uniqueCoordinates(vertical.map(v=>v.x))
  const numberRight=hasHeaders?componentHeader.x-10:leftBorders[1]
  const numbers=items.filter(item=>/^\d+$/.test(item.text) && item.x < numberRight && (!leftBorders.length || item.x>leftBorders[0]) && item.y<tableTop && (!vertical.length || item.y>Math.min(...vertical.map(v=>v.y1))))
    .filter(item=>!hasHeaders || item.y<Math.min(...headers.map(h=>h.y))-16).sort((a,b)=>b.y-a.y)
  const rows=[]
  for(let index=0;index<numbers.length;index++) {
    const number=numbers[index]
    const borders=uniqueCoordinates(vertical.filter(v=>v.y1<number.y && v.y2>number.y).map(v=>v.x))
    const fallback=hasHeaders?[componentHeader.x-16,primaryHeader.x-10,geometricHeader.x-25,briefHeader.x-20,Infinity]:null
    const columns=borders.length===6?borders.slice(1):fallback
    if(!columns) { rows.push({rowNumber:Number(number.text),sourcePage:page.pageNumber,sourceTeamHeading:heading,sourceText:joinCell(items),reason:'unresolved_table_cell_boundaries'});continue }
    const values=[]
    const regions=[]
    for(let col=0;col<4;col++) {
      const left=columns[col],right=columns[col+1],anchor=hasHeaders?headers[col].x:(left+right)/2
      const relevant=horizontal.filter(h=>h.x1<=anchor && h.x2>=anchor)
      const top=Math.min(...relevant.filter(h=>h.y>number.y).map(h=>h.y))
      const bottom=Math.max(...relevant.filter(h=>h.y<number.y).map(h=>h.y))
      const upper=Number.isFinite(top)?top:vertical.length?(hasHeaders?Math.min(...headers.map(h=>h.y))-16:tableTop):index===0?(hasHeaders?Math.min(...headers.map(h=>h.y))-16:number.y+32):(numbers[index-1].y+number.y)/2
      const lower=Number.isFinite(bottom)?bottom:vertical.length?Math.min(...vertical.map(v=>v.y1)):index===numbers.length-1?-Infinity:(number.y+numbers[index+1].y)/2
      const selected=items.filter(i=>i.x>left && i.x<right && i.y<upper && i.y>lower)
      values.push(joinCell(selected)); regions.push({left,right,top:upper,bottom:lower})
    }
    const fields={page:page.pageNumber,sourceTeamHeading:heading,sourceHeadingPage:page.pageNumber,componentName:values[0],primaryReason:values[1],geometricDifference:values[2],briefDescription:values[3]}
    rows.push({rowNumber:Number(number.text),fields,regions})
  }
  return { sourcePage:page.pageNumber,sourceTeamHeading:heading,teamId,hasHeaders,rows }
}
function parseLayoutPages(pages, context) {
  const records=[],rejected=[],discarded=[],pageAudit=[]
  for(const page of pages) {
    const inspection=inspectPresentationPage(page)
    pageAudit.push({sourcePage:page.pageNumber,sourceTeamHeading:inspection.sourceTeamHeading,teamId:inspection.teamId,rowsDetected:inspection.rows.length})
    for(const row of inspection.rows) {
      if(row.fields && ['componentName','primaryReason','geometricDifference','briefDescription'].every(f=>!row.fields[f])) { discarded.push({sourcePage:page.pageNumber,sourceTeamHeading:inspection.sourceTeamHeading,sourceRowNumber:row.rowNumber,reason:'empty_numbered_template_row'});continue }
      if(!row.fields?.componentName) { rejected.push({...row,sourceUrl:context.sourceUrl,reason:row.reason??'unresolved_table_cell_boundaries'});continue }
      const result=createRecord(row.fields,context,inspection.teamId,row.rowNumber)
      if(result.record)records.push(result.record);else rejected.push(result.rejected)
    }
  }
  return {records,rejected,discarded,pageAudit}
}

function parseFlattenedText(text, context) {
  const rejected=[...String(text).matchAll(entryStart)].map(match=>({sourceUrl:context.sourceUrl??null,sourcePage:null,sourceTeamHeading:null,sourceText:match[0].trim(),reason:'unstructured_pdf_text_requires_layout'}))
  return {records:[],rejected,discarded:[],pageAudit:[]}
}

/**
 * Parses FIA's text-layer table conservatively. A factual component name does
 * not need a 3D mapping; uncertain teams or incomplete rows still go to review.
 */
export function parsePresentationText(input, context) {
  if (typeof input === 'object' && Array.isArray(input?.pages)) {
    return parseLayoutPages(input.pages, context)
  }
  return parseFlattenedText(input, context)
}
