import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { downloadDocument } from './downloader.mjs'
import { extractPdfText } from './extractor.mjs'
import { fetchFiaDocumentIndex } from './finder.mjs'
import { parsePresentationText } from './parser.mjs'
import { findDuplicateRecordIds, validateUpdate } from './validator.mjs'
import { createPublicationPlan, writeJson, writePublishedDatasetAtomically } from './publication.mjs'

const args = Object.fromEntries(process.argv.slice(2).filter((value) => value.startsWith('--')).map((value) => {
  const [key, ...rest] = value.slice(2).split('='); return [key, rest.join('=') || true]
}))
const required = ['index-url', 'grand-prix', 'event-name']
for (const key of required) if (!args[key]) throw new Error(`Missing --${key}`)
const season = Number(args.season ?? 2026); const outputDirectory = resolve(args.output ?? 'ingestion/output/draft')
const documents = await fetchFiaDocumentIndex({ indexUrl: args['index-url'], grandPrixId: args['grand-prix'], season, eventName: args['event-name'] })
if (!documents.length && args['allow-empty'] === 'true') {
  const reportPath = await writeJson(resolve('ingestion/output/reports', `${args['grand-prix']}-no-document.json`), { generatedAt: new Date().toISOString(), grandPrixId: args['grand-prix'], season, status: 'NO_DOCUMENT_FOUND', recordsPublished: 0, manualReview: 0 })
  console.log(JSON.stringify({ grandPrixId: args['grand-prix'], status: 'NO_DOCUMENT_FOUND', reportPath }, null, 2)); process.exit(0)
}
if (!documents.length) throw new Error('No explicit FIA Car Presentation Submissions PDF found; previous datasets were not changed.')
const document = args['document-id'] ? documents.find((item) => item.documentId === args['document-id']) : documents[0]
if (!document) throw new Error('Requested FIA document was not found; previous datasets were not changed.')
const download = await downloadDocument(document, resolve('ingestion/raw'))
const extraction = await extractPdfText(download.path)
if (!extraction.text) throw new Error(`unsupported_pdf: ${extraction.extractionWarnings.join('; ')}`)
const parserVersion = 'fia-table-v1'
const parsed = parsePresentationText(extraction.text, { documentId: document.id, season, grandPrixId: args['grand-prix'], sourceDocument: document.title, sourceUrl: document.sourceUrl, sourceLanguage: 'en', contentHash: download.contentHash, parserVersion })
const duplicates = new Set(findDuplicateRecordIds(parsed.records)); const rejected = [...parsed.rejected]
const validated = []
for (const record of parsed.records) {
  const result = validateUpdate(record, [args['grand-prix']], season)
  if (duplicates.has(record.id)) rejected.push({ id: record.id, reason: 'duplicate_record' })
  else if (!result.valid) rejected.push({ id: record.id, reason: result.errors })
  else validated.push({ ...record, validationState: 'validated' })
}
const enrichedDocument = { ...document, contentHash: download.contentHash, path: download.path }
const review = { generatedAt: new Date().toISOString(), publicationGate: args.publish === 'true' ? 'safe_publish_requested' : 'draft_only', document: enrichedDocument, extraction: { pageCount: extraction.pageCount, metadata: extraction.metadata, extractionWarnings: extraction.extractionWarnings, textLength: extraction.text.length }, records: validated, rejected }
await mkdir(outputDirectory, { recursive: true })
const outputPath = resolve(outputDirectory, `${args['grand-prix']}-${document.documentId ?? 'document'}-review.json`)
await writeFile(outputPath, `${JSON.stringify(review, null, 2)}\n`)
const validatedPath = await writeJson(resolve('ingestion/output/validated', `${args['grand-prix']}-${document.documentId ?? 'document'}.json`), { ...review, records: validated, rejected: [] })
const grandPrix = { id: args['grand-prix'], season, name: args['grand-prix-name'] ?? args['event-name'], country: args.country ?? null, circuit: args.circuit ?? null, startDate: args['start-date'] ?? null, endDate: args['end-date'] ?? null, status: 'scheduled' }
const publication = createPublicationPlan({ document: enrichedDocument, records: validated, rejected, grandPrix, season, parserVersion })
const manualReviewPath = await writeJson(resolve('ingestion/output/manual-review', `${args['grand-prix']}-${document.documentId ?? 'document'}.json`), { generatedAt: new Date().toISOString(), grandPrixId: args['grand-prix'], document: enrichedDocument, records: publication.manualReview })
let publishedPath = null
let alreadyPublished = false
const targetPath = resolve(args['publish-output'] ?? `public/data/grands-prix/${season}/${args['grand-prix']}.json`)
if (args.publish === 'true') {
  try { const current = JSON.parse(await readFile(targetPath, 'utf8')); alreadyPublished = current?.sourceDocument?.documentHash === download.contentHash && current?.schemaVersion === publication.dataset?.schemaVersion } catch { /* first publication */ }
  if (publication.dataset) publishedPath = alreadyPublished ? targetPath : await writePublishedDatasetAtomically(targetPath, publication.dataset)
}
const status = publication.dataset ? (alreadyPublished ? 'UNCHANGED' : args.publish === 'true' ? 'PROCESSED' : 'VALIDATED') : 'MANUAL_REVIEW_ONLY'
console.log(JSON.stringify({ status, document: document.title, sourceUrl: document.sourceUrl, contentHash: download.contentHash, pages: extraction.pageCount, recordsFound: parsed.records.length, validated: validated.length, publishable: publication.dataset?.updates.length ?? 0, published: args.publish === 'true' && !alreadyPublished ? publication.dataset?.updates.length ?? 0 : 0, alreadyPublished, manualReview: publication.manualReview.length, warnings: extraction.extractionWarnings, outputPath, validatedPath, manualReviewPath, publishedPath }, null, 2))
