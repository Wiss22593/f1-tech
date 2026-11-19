import { addAutomaticSpanish } from './translate-es.mjs'
import { createPublicationPlan } from './publication.mjs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { relative, resolve } from 'node:path'
import { downloadDocument } from './downloader.mjs'
import { extractPdfText } from './extractor.mjs'
import { fetchFiaDocumentIndex } from './finder.mjs'
import { reconstructPresentation, parserVersion } from './reconstruct.mjs'
import { writeJson, writePublishedDatasetAtomically } from './publication.mjs'
import { isCompletePublishedDataset } from './auto-publish.mjs'

const args = Object.fromEntries(process.argv.slice(2).filter((value) => value.startsWith('--')).map((value) => {
  const [key, ...rest] = value.slice(2).split('='); return [key, rest.join('=') || true]
}))
const required = ['index-url', 'grand-prix', 'event-name']
for (const key of required) if (!args[key]) throw new Error(`Missing --${key}`)
const season = Number(args.season ?? 2026); const outputDirectory = resolve(args.output ?? 'ingestion/output/draft')
const targetPath = resolve(args['publish-output'] ?? `public/data/grands-prix/${season}/${args['grand-prix']}.json`)
try {
  const current = JSON.parse(await readFile(targetPath, 'utf8'))
  if (isCompletePublishedDataset(current, relative(process.cwd(), targetPath))) {
    console.log(JSON.stringify({ grandPrixId: args['grand-prix'], status: 'ALREADY_PUBLISHED', publishedPath: targetPath }, null, 2))
    process.exit(0)
  }
} catch (error) {
  if (error?.code !== 'ENOENT' && !(error instanceof SyntaxError)) throw error
}
const documents = await fetchFiaDocumentIndex({ indexUrl: args['index-url'], grandPrixId: args['grand-prix'], season, eventName: args['event-name'] })
if (!documents.length && args['allow-empty'] === 'true') {
  const reportPath = await writeJson(resolve('ingestion/output/reports', `${args['grand-prix']}-no-document.json`), { generatedAt: new Date().toISOString(), grandPrixId: args['grand-prix'], season, status: 'NO_DOCUMENT_FOUND', recordsPublished: 0, manualReview: 0 })
  console.log(JSON.stringify({ grandPrixId: args['grand-prix'], status: 'NO_DOCUMENT_FOUND', reportPath }, null, 2)); process.exit(0)
}
if (!documents.length) throw new Error('No explicit FIA Car Presentation Submissions PDF found; previous datasets were not changed.')
if (documents.length > 1) throw new Error(`AMBIGUOUS_FIA_DOCUMENTS: expected one Car Presentation Submissions document for ${args['grand-prix']}, found ${documents.length}; no document was selected.`)
const document = documents[0]
if (args['document-id'] && document.documentId !== args['document-id']) throw new Error(`FIA_DOCUMENT_ID_CHANGED: expected ${args['document-id']}, found ${document.documentId ?? 'unknown'}; no dataset was written.`)
if (!document) throw new Error('Requested FIA document was not found; previous datasets were not changed.')
const download = await downloadDocument(document, resolve('ingestion/raw'))
const extraction = await extractPdfText(download.path)
if (!extraction.text) throw new Error(`unsupported_pdf: ${extraction.extractionWarnings.join('; ')}`)
const enrichedDocument = { ...document, contentHash: download.contentHash, path: download.path }
const grandPrix = { id: args['grand-prix'], season, name: args['grand-prix-name'] ?? args['event-name'], country: args.country ?? null, circuit: args.circuit ?? null, startDate: args['start-date'] ?? null, endDate: args['end-date'] ?? null, status: 'scheduled' }
const reconstruction=reconstructPresentation(extraction,enrichedDocument,grandPrix,season)
const {parsed,rejected}=reconstruction
const validated=await addAutomaticSpanish(reconstruction.validated)
const publication=createPublicationPlan({document:enrichedDocument,records:validated,rejected,grandPrix,season,parserVersion})
const review = { generatedAt: new Date().toISOString(), publicationGate: args.publish === 'true' ? 'safe_publish_requested' : 'draft_only', document: enrichedDocument, extraction: { pageCount: extraction.pageCount, metadata: extraction.metadata, extractionWarnings: extraction.extractionWarnings, textLength: extraction.text.length }, records: validated, rejected, pageAudit: parsed.pageAudit, discarded: parsed.discarded, appliedReviews: parsed.appliedReviews }
await mkdir(outputDirectory, { recursive: true })
const outputPath = resolve(outputDirectory, `${args['grand-prix']}-${document.documentId ?? 'document'}-review.json`)
await writeFile(outputPath, `${JSON.stringify(review, null, 2)}\n`)
const validatedPath = await writeJson(resolve('ingestion/output/validated', `${args['grand-prix']}-${document.documentId ?? 'document'}.json`), { ...review, records: validated, rejected: [] })
const manualReviewPath = await writeJson(resolve('ingestion/output/manual-review', `${args['grand-prix']}-${document.documentId ?? 'document'}.json`), { generatedAt: new Date().toISOString(), grandPrixId: args['grand-prix'], document: enrichedDocument, records: publication.manualReview })
let publishedPath = null
if (args.publish === 'true') {
  if (publication.manualReview.length) throw new Error('PUBLICATION_BLOCKED_INCOMPLETE: some official records still require review; no dataset written')
  if (publication.dataset) publishedPath = await writePublishedDatasetAtomically(targetPath, publication.dataset)
}
const status = publication.dataset ? (args.publish === 'true' ? 'PROCESSED' : 'VALIDATED') : 'MANUAL_REVIEW_ONLY'
console.log(JSON.stringify({ status, document: document.title, sourceUrl: document.sourceUrl, contentHash: download.contentHash, pages: extraction.pageCount, recordsFound: parsed.records.length, validated: validated.length, publishable: publication.dataset?.updates.length ?? 0, published: args.publish === 'true' ? publication.dataset?.updates.length ?? 0 : 0, manualReview: publication.manualReview.length, automaticSpanish: validated.filter(r=>r.translations?.es?.method==='automatic').length, warnings: extraction.extractionWarnings, outputPath, validatedPath, manualReviewPath, publishedPath }, null, 2))
