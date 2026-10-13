import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeComponent, normalizeTeam } from '../ingestion/fia/normalizer.mjs'
import { findDuplicateRecordIds, validateUpdate } from '../ingestion/fia/validator.mjs'
import { fetchFiaDocumentIndex, isPresentationTitle, resolveFiaEventIndex } from '../ingestion/fia/finder.mjs'
import { parsePresentationText } from '../ingestion/fia/parser.mjs'
import { extractPdfText, extractTableLines } from '../ingestion/fia/extractor.mjs'
import { mapFiaComponent, suggestFiaComponents } from '../ingestion/fia/component-registry.mjs'
import { createPublicationPlan, isPublishedDatasetCurrent, publicationDecision } from '../ingestion/fia/publication.mjs'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { eventRegistry2026, selectCurrentEvents, selectIngestionWindowEvents } from '../ingestion/fia/events.mjs'
import { buildDataChangePlan } from '../ingestion/fia/prepare-pr.mjs'
import { buildAutoPublishChangePlan, validateAutoPublishDataset } from '../ingestion/fia/auto-publish.mjs'
import { JolpicaChampionshipProvider } from '../ingestion/championship/jolpica.mjs'
import { resolveChampionshipSource } from '../ingestion/championship/source-config.mjs'
import { selectLatestPublishedGrandPrixId } from '../src/services/fia/latest-published.mjs'

const valid = {
  id: 'monza-mercedes-rear-wing', grandPrixId: 'italian-grand-prix-2026', teamId: 'mercedes', componentId: 'rear wing',
  componentName: 'Rear Wing', primaryReason: 'Performance - Local Load', geometricDifference: 'Revised rear wing geometry.', briefDescription: 'The revised surface changes local load.',
  source: 'FIA', sourceUrl: 'https://www.fia.com/document.pdf', sourceDocument: 'Car Presentation Submissions', sourceText: 'Rear Wing | Performance - Local Load | Revised rear wing geometry. | The revised surface changes local load.', description: 'The revised surface changes local load.',
}

test('normalizes only stable, known team and component ids', () => {
  assert.equal(normalizeTeam('Red Bull'), 'red-bull-racing')
  assert.equal(normalizeTeam('Mercedes-AMG PETRONAS F1 Team'), 'mercedes')
  assert.equal(normalizeTeam('Visa Cash App Racing Bulls'), 'racing-bulls')
  assert.equal(normalizeComponent('Rear Wing'), 'rear-wing')
  assert.equal(normalizeTeam('Unknown Team'), null)
  assert.equal(normalizeComponent('Mystery part'), null)
})

test('component registry maps explicit FIA names and only suggests ambiguous names', () => {
  assert.equal(mapFiaComponent('Rear Wing'), 'rear-wing')
  assert.equal(mapFiaComponent('Unrecognised wing structure'), null)
  assert.deepEqual(suggestFiaComponents('Unrecognised wing structure'), ['front-wing', 'rear-wing'])
})

test('validator rejects records without traceable content', () => {
  assert.deepEqual(validateUpdate(valid, ['italian-grand-prix-2026']), { valid: true, errors: [] })
  assert.equal(validateUpdate({ ...valid, componentId: 'unknown' }, ['italian-grand-prix-2026']).valid, false)
  assert.equal(validateUpdate({ ...valid, briefDescription: null, geometricDifference: null }, ['italian-grand-prix-2026']).valid, false)
})

test('duplicate source rows are detected before publication', () => {
  assert.deepEqual(findDuplicateRecordIds([valid, { ...valid, id: 'duplicate' }]).sort(), ['duplicate', valid.id].sort())
})

test('publication gate permits only validated deterministic FIA records', () => {
  const record = { ...valid, season: 2026, contentHash: 'a'.repeat(64), parserConfidence: 'deterministic_table', validationState: 'validated' }
  assert.equal(publicationDecision(record, { grandPrixIds: ['italian-grand-prix-2026'], season: 2026 }).publishable, true)
  assert.equal(publicationDecision({ ...record, parserConfidence: 'heuristic' }, { grandPrixIds: ['italian-grand-prix-2026'], season: 2026 }).publishable, false)
  assert.equal(publicationDecision({ ...record, sourceUrl: 'https://example.test/a.pdf' }, { grandPrixIds: ['italian-grand-prix-2026'], season: 2026 }).publishable, false)
})

test('a complete FIA row without a hotspot remains factual and publishable', () => {
  const record = { ...valid, id: 'madrid-mercedes-front-drum', grandPrixId: 'madrid-grand-prix-2026', componentId: null, componentName: 'Front Drum', visualizable: false, season: 2026, contentHash: 'a'.repeat(64), parserConfidence: 'deterministic_table', validationState: 'validated' }
  assert.deepEqual(validateUpdate(record, ['madrid-grand-prix-2026']), { valid: true, errors: [] })
  assert.equal(publicationDecision(record, { grandPrixIds: ['madrid-grand-prix-2026'], season: 2026 }).publishable, true)
  assert.equal(record.componentId, null)
})

test('publication plan separates uncertain records into manual review without an empty replacement', () => {
  const record = { ...valid, season: 2026, contentHash: 'a'.repeat(64), parserConfidence: 'deterministic_table', validationState: 'validated' }
  const plan = createPublicationPlan({ document: { id: 'doc-10', title: valid.sourceDocument, sourceUrl: valid.sourceUrl, contentHash: record.contentHash, retrievedAt: '2026-09-09T00:00:00.000Z' }, records: [record], rejected: [{ sourceText: 'Unknown part', reason: 'unmapped_component' }], grandPrix: { id: 'italian-grand-prix-2026', name: 'Italian Grand Prix' }, season: 2026 })
  assert.equal(plan.dataset.updates[0].validationState, 'published')
  assert.equal(plan.manualReview.length, 1)
})

test('FIA finder supports the legacy direct-PDF structure and rejects technical infringement', async () => {
  const html = await readFile(new URL('./fixtures/fia-index-legacy.html', import.meta.url), 'utf8')
  const records = await fetchFiaDocumentIndex({ indexUrl: 'https://www.fia.com/documents/formula-1', grandPrixId: 'australia-2026', season: 2026, eventName: 'Australian Grand Prix', fetchFn: async () => new Response(html) })
  assert.equal(records.length, 1)
  assert.equal(records[0].documentId, '9')
  assert.equal(records[0].eventId, 'australia-2026')
  assert.match(records[0].sourceUrl, /^https:\/\/www\.fia\.com\//)
  assert.equal(isPresentationTitle('Doc 70 - Technical Infringement'), false)
  assert.equal(isPresentationTitle('Decision - Car Presentation Submissions'), false)
})

test('FIA finder reads the current nested Madrid structure and detects Doc 11', async () => {
  const html = await readFile(new URL('./fixtures/fia-index-current-madrid.html', import.meta.url), 'utf8')
  const records = await fetchFiaDocumentIndex({ indexUrl: 'https://www.fia.com/documents/championships/f1/season/2026/event/Spanish%20Grand%20Prix', grandPrixId: 'madrid-grand-prix-2026', season: 2026, eventName: 'Spanish Grand Prix', fetchFn: async () => new Response(html) })
  assert.equal(records.length, 1)
  assert.equal(records[0].documentId, '11')
  assert.equal(records[0].title, 'Doc 11 - Car Presentation Submissions')
  assert.match(records[0].sourceUrl, /2026_spanish_grand_prix_-_car_presentation_submissions\.pdf$/)
})

test('FIA finder falls back to the season index and stays scoped to the exact event block', async () => {
  const indexUrl = 'https://www.fia.com/documents/championships/f1/season/2026/event/Spanish%20Grand%20Prix'
  const seasonUrl = 'https://www.fia.com/documents/championships/f1/season/2026'
  const seasonHtml = await readFile(new URL('./fixtures/fia-season-multi-event.html', import.meta.url), 'utf8')
  const calls = []
  const fetchFn = async (url) => {
    calls.push(url)
    return new Response(url === indexUrl ? '<div class="event-title active">Spanish Grand Prix</div><a href="/entry.pdf">Doc 10 - Entry List</a>' : seasonHtml)
  }
  const records = await fetchFiaDocumentIndex({ indexUrl, grandPrixId: 'madrid-grand-prix-2026', season: 2026, eventName: 'Spanish Grand Prix', fetchFn })
  assert.deepEqual(calls, [indexUrl, seasonUrl])
  assert.equal(records.length, 1)
  assert.equal(records[0].documentId, '11')
  assert.match(records[0].sourceUrl, /spanish_grand_prix/)
  assert.doesNotMatch(records[0].sourceUrl, /italian_grand_prix/)
})

test('FIA season fallback never takes a presentation document from another GP', async () => {
  const indexUrl = 'https://www.fia.com/documents/championships/f1/season/2026/event/Spanish%20Grand%20Prix'
  const seasonHtml = '<div class="event-title">Italian Grand Prix</div><a href="/system/files/decision-document/italian_car_presentation_submissions.pdf"><div class="title">Doc 10 - Car Presentation Submissions</div></a><div class="event-title active">Spanish Grand Prix</div><a href="/entry.pdf"><div class="title">Doc 11 - Entry List</div></a>'
  const records = await fetchFiaDocumentIndex({ indexUrl, grandPrixId: 'madrid-grand-prix-2026', season: 2026, eventName: 'Spanish Grand Prix', fetchFn: async (url) => new Response(url === indexUrl ? '' : seasonHtml) })
  assert.deepEqual(records, [])
})

test('FIA finder follows an official intermediate link to its final official PDF', async () => {
  const indexUrl = 'https://www.fia.com/documents/championships/f1/season/2026/event/Spanish%20Grand%20Prix'
  const intermediateUrl = 'https://www.fia.com/document/madrid-car-presentation'
  const html = `<a href="${intermediateUrl}">Doc 11 - Car Presentation Submissions</a>`
  const records = await fetchFiaDocumentIndex({
    indexUrl, grandPrixId: 'madrid-grand-prix-2026', season: 2026, eventName: 'Spanish Grand Prix',
    fetchFn: async (url) => new Response(url === intermediateUrl ? '<a href="/system/files/decision-document/madrid_car_presentation_submissions.pdf">Download PDF</a>' : html),
  })
  assert.equal(records.length, 1)
  assert.equal(records[0].sourceUrl, 'https://www.fia.com/system/files/decision-document/madrid_car_presentation_submissions.pdf')
})

test('validator rejects a malformed source hash and a wrong season', () => {
  assert.equal(validateUpdate({ ...valid, season: 2025 }, ['italian-grand-prix-2026']).valid, false)
  assert.equal(validateUpdate({ ...valid, contentHash: 'not-a-sha256' }, ['italian-grand-prix-2026']).valid, false)
})

test('validator rejects a missing or non-HTTPS FIA source URL', () => {
  assert.equal(validateUpdate({ ...valid, sourceUrl: '' }, ['italian-grand-prix-2026']).valid, false)
  assert.equal(validateUpdate({ ...valid, sourceUrl: 'http://example.test/document.pdf' }, ['italian-grand-prix-2026']).valid, false)
})

test('flattened text without a page heading and cell geometry is review-only', async () => {
  const text = await readFile(new URL('./fixtures/fia-presentation.txt', import.meta.url), 'utf8')
  const parsed = parsePresentationText(text, { documentId: 'doc-10', season: 2026, grandPrixId: 'italian-grand-prix-2026', sourceDocument: 'Car Presentation Submissions', sourceUrl: valid.sourceUrl, contentHash: 'a'.repeat(64) })
  assert.equal(parsed.records.length, 0)
  assert.ok(parsed.rejected.length > 0)
  assert.ok(parsed.rejected.every(row=>row.reason==='unstructured_pdf_text_requires_layout'))
})

test('layout parser preserves the four FIA columns, multiline cells and repeated components', async () => {
  const extraction = JSON.parse(await readFile(new URL('./fixtures/fia-presentation-layout.json', import.meta.url), 'utf8'))
  const parsed = parsePresentationText(extraction, { documentId: 'doc-layout', season: 2026, grandPrixId: 'italian-grand-prix-2026', sourceDocument: 'Car Presentation Submissions', sourceUrl: valid.sourceUrl, contentHash: 'a'.repeat(64) })
  assert.equal(parsed.rejected.length, 0)
  assert.equal(parsed.records.length, 3)
  assert.deepEqual(parsed.records[0], { ...parsed.records[0], componentName: 'Rear Wing', primaryReason: 'Performance - Local Load', geometricDifference: 'Revised upper plane geometry', briefDescription: 'The revised surface changes the local pressure distribution without truncating this second line of the description.' })
  assert.equal(parsed.records[1].componentId, 'rear-wing')
  assert.equal(parsed.records[1].primaryReason, 'Reliability')
  assert.match(parsed.records[0].sourceText, /^Rear Wing \| Performance - Local Load \|/)
  assert.deepEqual(parsed.records[2], { ...parsed.records[2], componentId: null, visualizable: false, componentName: 'Front Drum', primaryReason: 'Performance - Flow Conditioning', geometricDifference: 'Front lip reprofiled', briefDescription: 'The revised lip improves attachment through steering conditions.' })
})

test('Garage has no invented FIA fallback and keeps Spanish presentation copy separate from English source data', async () => {
  const garageData = await readFile(new URL('../src/features/garage/data.ts', import.meta.url), 'utf8')
  assert.doesNotMatch(garageData, /La FIA publicó una actualización técnica para/)
  assert.match(garageData, /localizeFiaUpdate\(update\.fiaRecord, locale\)/)
  assert.doesNotMatch(garageData, /spanishMadridUpdates|spanishPublishedDescriptions/)
})

test('published Madrid dataset preserves valid FIA column fields in English', async () => {
  const dataset = JSON.parse(await readFile(new URL('../public/data/grands-prix/2026/madrid-grand-prix-2026.json', import.meta.url), 'utf8'))
  assert.equal(dataset.sourceDocument.documentHash, 'c92e9191ede7c2bbb5aeabb8b2026f599d3f71fe432bc55311d63cfa1cb6f6a7')
  assert.ok(dataset.updates.length > 0)
  for (const update of dataset.updates) {
    assert.equal(update.sourceLanguage, 'en')
    assert.ok(update.componentName)
    assert.ok(update.primaryReason)
    assert.ok(update.geometricDifference || update.briefDescription)
    assert.match(update.sourceText, /\|/)
    assert.deepEqual(validateUpdate(update, ['madrid-grand-prix-2026']), { valid: true, errors: [] })
  }
})

test('Madrid reconciliation preserves all deterministic rows and the Mercedes published row', async () => {
  const dataset = JSON.parse(await readFile(new URL('../public/data/grands-prix/2026/madrid-grand-prix-2026.json', import.meta.url), 'utf8'))
  const counts = Object.fromEntries(dataset.teams.map((teamId) => [teamId, dataset.updates.filter((update) => update.teamId === teamId).length]))
  assert.equal(dataset.updates.length, 10)
  assert.deepEqual(counts, { mclaren: 1, mercedes: 3, 'red-bull-racing': 2, ferrari: 1, alpine: 1, cadillac: 2 })
  assert.deepEqual(dataset.updates.filter((update) => update.teamId === 'mercedes').map(({ componentName }) => componentName), ['Rear Wing', 'Exhaust Tailpipe', 'Front Drum'])
  assert.deepEqual(dataset.updates.filter((update) => update.teamId === 'red-bull-racing').map(({ componentName }) => componentName), ['Rear Corner', 'Floor Bib'])
  assert.deepEqual(dataset.updates.filter((update) => update.visualizable === false).map(({ componentId }) => componentId), [null, null, null])
  assert.equal(dataset.validation.manualReview, 0)
  assert.equal(dataset.parserVersion, 'fia-table-v4')
})

test('Development Battle counts every factual published row, including non-visualizable updates', async () => {
  const dataset = JSON.parse(await readFile(new URL('../public/data/grands-prix/2026/madrid-grand-prix-2026.json', import.meta.url), 'utf8'))
  const counts = dataset.updates.reduce((result, update) => ({ ...result, [update.teamId]: (result[update.teamId] ?? 0) + 1 }), {})
  assert.equal(counts.mercedes, 3)
  assert.equal(counts['red-bull-racing'], 2)
  assert.equal(Object.values(counts).reduce((sum, count) => sum + count, 0), 10)
})

test('latest published GP ignores newer future or no-document events without datasets', () => {
  const published = new Set(['italian-grand-prix-2026', 'madrid-grand-prix-2026'])
  assert.equal(selectLatestPublishedGrandPrixId(eventRegistry2026, published), 'madrid-grand-prix-2026')
  assert.equal(selectLatestPublishedGrandPrixId(eventRegistry2026, new Set(['italian-grand-prix-2026'])), 'italian-grand-prix-2026')
  assert.equal(selectLatestPublishedGrandPrixId(eventRegistry2026, published), 'madrid-grand-prix-2026')
})

test('Garage opens text-only updates without assigning a fake camera component', async () => {
  const garage = await readFile(new URL('../src/features/garage/GaragePage.tsx', import.meta.url), 'utf8')
  assert.match(garage, /setSelectedUpdateId\(selecting \? update\.id : undefined\)/)
  assert.match(garage, /if \(!update\.componentId\) \{ setSelectedComponent\(undefined\)/)
  assert.match(garage, /selectedComponentName=\{focusFromUpdate \? selectedUpdate\?\.fiaRecord\?\.componentName/)
  assert.match(garage, /nonVisualizableUpdates\.map\(renderTextOnlyUpdate\)/)
  assert.match(garage, /findPublishedGrandPrix\(\)/)
})

test('Madrid reruns are idempotent for the same hash, schema and parser version', async () => {
  const dataset = JSON.parse(await readFile(new URL('../public/data/grands-prix/2026/madrid-grand-prix-2026.json', import.meta.url), 'utf8'))
  assert.equal(isPublishedDatasetCurrent(dataset, dataset, dataset.sourceDocument.documentHash, 'fia-table-v4'), true)
  assert.equal(isPublishedDatasetCurrent(dataset, dataset, 'b'.repeat(64), 'fia-table-v4'), false)
  assert.equal(isPublishedDatasetCurrent(dataset, dataset, dataset.sourceDocument.documentHash, 'fia-table-v3'), false)
})

test('PDF extractor reads a generated embedded text layer', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'f1-tech-pdf-fixture-'))
  const path = join(directory, 'text-layer.pdf')
  const stream = 'BT /F1 18 Tf 72 720 Td (F1 TECH extractor fixture) Tj ET'
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ]
  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(pdf, 'ascii'))
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`
  }
  const xrefOffset = Buffer.byteLength(pdf, 'ascii')
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  pdf += offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`

  try {
    await writeFile(path, pdf, 'ascii')
    const extracted = await extractPdfText(path)
    assert.equal(extracted.pageCount, 1)
    assert.equal(extracted.text, 'F1 TECH extractor fixture')
    assert.equal(extracted.pages[0].items[0].text, 'F1 TECH extractor fixture')
    assert.deepEqual(extracted.extractionWarnings, [])
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('canonical 2026 registry contains all 24 official calendar rounds', () => {
  assert.equal(eventRegistry2026.length, 24)
  assert.equal(new Set(eventRegistry2026.map(({ id }) => id)).size, 24)
  assert.equal(eventRegistry2026.filter(({ indexUrl }) => indexUrl).length, 16)
})

test('current event discovery selects Madrid during its verified race window', () => {
  assert.deepEqual(selectCurrentEvents(eventRegistry2026, new Date('2026-09-12T12:00:00Z')).map(({ id }) => id), ['madrid-grand-prix-2026'])
})

test('legacy backfill date-window helper remains compatible with historical fixtures', () => {
  assert.deepEqual(selectIngestionWindowEvents(eventRegistry2026, new Date('2026-09-11T02:47:00Z')).map(({ id }) => id), ['madrid-grand-prix-2026'])
  assert.deepEqual(selectIngestionWindowEvents(eventRegistry2026, new Date('2026-09-17T12:00:00Z')), [])
})

test('auto-publication makes no commit for no-document, unchanged or manual-review-only runs', () => {
  for (const outcome of ['NO_DOCUMENT_FOUND', 'UNCHANGED', 'MANUAL_REVIEW_ONLY']) {
    const plan = buildAutoPublishChangePlan([])
    assert.equal(plan.status, 'NO_CHANGES', outcome)
    assert.equal(plan.safeToCommit, false, outcome)
  }
})

test('auto-publication aborts when any changed path is outside the dataset allowlist', () => {
  const plan = buildAutoPublishChangePlan(['public/data/grands-prix/2026/madrid-grand-prix-2026.json', 'src/app/App.tsx'])
  assert.equal(plan.status, 'UNAUTHORIZED_CHANGED_PATHS')
  assert.deepEqual(plan.unauthorizedPaths, ['src/app/App.tsx'])
  assert.equal(plan.safeToCommit, false)
})

test('auto-publication accepts a non-empty final dataset and rejects failed validation', () => {
  const hash = 'a'.repeat(64)
  const record = { ...valid, id: 'madrid-mercedes-rear-wing', grandPrixId: 'madrid-grand-prix-2026', season: 2026, contentHash: hash, parserConfidence: 'deterministic_table', validationState: 'published', publishedAt: '2026-09-11T12:00:00.000Z' }
  const dataset = {
    schemaVersion: 'fia-published-dataset-v1', season: 2026,
    grandPrix: { id: 'madrid-grand-prix-2026', name: 'Madrid Grand Prix' },
    updates: [record],
    sourceDocument: { title: 'Doc 10 — Car Presentation Submissions', sourceUrl: valid.sourceUrl, documentHash: hash },
    validation: { recordsPublished: 1 },
  }
  const path = 'public/data/grands-prix/2026/madrid-grand-prix-2026.json'
  assert.deepEqual(buildAutoPublishChangePlan([path]).datasetPaths, [path])
  assert.equal(validateAutoPublishDataset(dataset, path).valid, true)
  const invalid = validateAutoPublishDataset({ ...dataset, updates: [], validation: { recordsPublished: 0 } }, path)
  assert.equal(invalid.valid, false)
  assert.match(invalid.errors.join(' '), /zero_published_records/)
})

test('data PR preparation allowlists datasets and rejects application files', () => {
  const plan = buildDataChangePlan(['src/app/App.tsx', 'public/data/grands-prix/2026/a.json', 'data/grands-prix/2026.json'], new Date('2026-09-09T00:00:00Z'))
  assert.deepEqual(plan.files, ['data/grands-prix/2026.json', 'public/data/grands-prix/2026/a.json'])
  assert.equal(plan.safeToPropose, true)
  assert.equal(buildDataChangePlan(['src/app/App.tsx']).safeToPropose, false)
  assert.equal(buildDataChangePlan([]).safeToPropose, false)
})

test('advertising slots are enumerated and disabled by default', async () => {
  const config = JSON.parse(await readFile(new URL('../src/config/ads.json', import.meta.url), 'utf8'))
  assert.equal(config.enabled, false)
  assert.equal(config.provider, null)
  assert.deepEqual(config.placements.sort(), ['circuits-bottom', 'teams-bottom', 'technical-preview-inline', 'updates-bottom'])
  const garage = await readFile(new URL('../src/features/garage/GaragePage.tsx', import.meta.url), 'utf8')
  assert.doesNotMatch(garage, /AdSlot|data-ad-placement/)
})

test('championship provider maps live-shaped payloads to the stable domain contract', async () => {
  const payloads = {
    driverStandings: { MRData: { StandingsTable: { StandingsLists: [{ season: '2026', round: '13', DriverStandings: [{ position: '1', points: '240', Driver: { driverId: 'russell', givenName: 'George', familyName: 'Russell' }, Constructors: [{ constructorId: 'mercedes' }] }] }] } } },
    constructorStandings: { MRData: { StandingsTable: { StandingsLists: [{ season: '2026', round: '13', ConstructorStandings: [{ position: '1', points: '400', Constructor: { constructorId: 'mercedes' } }] }] } } },
  }
  const fetchFn = async (url) => new Response(JSON.stringify(url.includes('driverStandings') ? payloads.driverStandings : payloads.constructorStandings))
  const result = await new JolpicaChampionshipProvider({ fetchFn }).getSnapshot(2026)
  assert.deepEqual(result.drivers[0], { position: 1, driverId: 'russell', driverName: 'George Russell', teamId: 'mercedes', points: 240 })
  assert.deepEqual(result.constructors[0], { position: 1, teamId: 'mercedes', points: 400 })
  assert.equal(result.stale, false)
})

test('championship provider exposes the last valid dataset as stale on source failure', async () => {
  const fallback = { season: 2026, retrievedAt: '2026-09-01T00:00:00.000Z', drivers: [{ position: 1 }], constructors: [{ position: 1 }] }
  const result = await new JolpicaChampionshipProvider({ fallback, fetchFn: async () => { throw new Error('offline') } }).getSnapshot(2026)
  assert.equal(result.stale, true)
  assert.equal(result.fallbackReason, 'offline')
  assert.equal(result.retrievedAt, fallback.retrievedAt)
})

test('commercial source guard blocks Jolpica and unconfigured production credentials', () => {
  assert.throws(() => resolveChampionshipSource({ CHAMPIONSHIP_SOURCE: 'jolpica-development' }), /NONCOMMERCIAL_CHAMPIONSHIP_SOURCE_BLOCKED/)
  assert.throws(() => resolveChampionshipSource({ CHAMPIONSHIP_SOURCE: 'sportmonks' }), /SPORTMONKS_CREDENTIALS_REQUIRED/)
  assert.equal(resolveChampionshipSource({ CHAMPIONSHIP_SOURCE: 'sportmonks', SPORTMONKS_API_TOKEN: 'test-token' }).productionEligible, true)
})

test('service worker keeps published JSON network-first and BGRT explicitly cached', async () => {
  const worker = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8')
  assert.match(worker, /startsWith\('\/data\/'\)/)
  assert.match(worker, /const BGRT_MODEL = '\/models\/bgrt-f1-concept-2026\.glb'/)
  assert.doesNotMatch(worker, /url\.includes\('\/data\/'\)/)
})

test('six-locale catalog covers Garage labels and factual offline state', async () => {
  const catalogue = await readFile(new URL('../src/i18n/index.ts', import.meta.url), 'utf8')
  assert.doesNotMatch(catalogue, /components:\s*\{\s*\}/)
  for (const locale of ['es', 'en', 'it', 'pt', 'fr', 'de']) {
    assert.match(catalogue, new RegExp(`\\b${locale}: \\{ name:`))
  }
  for (const page of ['technical-preview/TechnicalPreview.tsx', 'insights/useSeasonRecords.ts']) {
    const source = await readFile(new URL(`../src/features/${page}`, import.meta.url), 'utf8')
    assert.match(source, /navigator\.onLine \? 'stale' : 'offline'/)
  }
})

test('legacy backfill date-window covers the recovered Thursday event', () => {
  for (const at of ['2026-09-23T12:00:00Z', '2026-09-24T12:00:00Z', '2026-09-27T12:00:00Z']) {
    assert.deepEqual(selectIngestionWindowEvents(eventRegistry2026, new Date(at)).map(({ id }) => id), ['azerbaijan-2026'])
  }
  assert.deepEqual(selectIngestionWindowEvents(eventRegistry2026, new Date('2026-09-28T12:00:00Z')), [])
  assert.equal(selectCurrentEvents(eventRegistry2026, new Date('2026-09-24T12:00:00Z'))[0].id, 'azerbaijan-2026')
})

test('Sepang has one FIA Bahrain identity and resolves an advertised official index without aliases', async () => {
  const event = eventRegistry2026.find(({ id }) => id === 'bahrain-2026')
  assert.equal(event.eventName, 'Bahrain Grand Prix')
  assert.equal(event.country, 'Malaysia')
  assert.equal(event.circuit, 'Sepang International Circuit')
  const path = '/documents/championships/fia-formula-one-world-championship-14/season/season-2026-2072/event/Bahrain%20Grand%20Prix'
  const fetchFn = async () => new Response(`<option value="${path}">Bahrain Grand Prix</option>`)
  assert.equal(await resolveFiaEventIndex({ ...event, indexUrl: null }, { fetchFn }), 'https://www.fia.com' + path)
  assert.equal(await resolveFiaEventIndex({ ...event, eventName: 'Malaysia Grand Prix', indexUrl: null }, { fetchFn }), null)
  assert.deepEqual(selectIngestionWindowEvents(eventRegistry2026, new Date('2026-10-01T12:00:00Z')).map(({ id }) => id), ['bahrain-2026'])
})

test('a primary index returning other event blocks never publishes their documents', async () => {
  const html = '<div class="event-title">Azerbaijan Grand Prix</div><a href="/baku.pdf">Doc 11 - Car Presentation Submissions</a>'
  const result = await fetchFiaDocumentIndex({ indexUrl: eventRegistry2026.find(({ id }) => id === 'bahrain-2026').indexUrl, grandPrixId: 'bahrain-2026', eventName: 'Bahrain Grand Prix', season: 2026, fetchFn: async () => new Response(html) })
  assert.deepEqual(result, [])
})

test('recovered Thursday document remains deterministic and latest published advances only with real data', async () => {
  const dataset = JSON.parse(await readFile(new URL('../public/data/grands-prix/2026/azerbaijan-2026.json', import.meta.url), 'utf8'))
  assert.equal(dataset.updates.length, 38)
  assert.equal(dataset.validation.manualReview, 0)
  assert.equal(validateAutoPublishDataset(dataset, 'public/data/grands-prix/2026/azerbaijan-2026.json').valid, true)
  assert.equal(isPublishedDatasetCurrent(dataset, dataset, dataset.sourceDocument.documentHash, 'fia-table-v4'), true)
  const ids = new Set(['madrid-grand-prix-2026', 'azerbaijan-2026'])
  assert.equal(selectLatestPublishedGrandPrixId(eventRegistry2026, ids), 'azerbaijan-2026')
  ids.add('bahrain-2026')
  assert.equal(selectLatestPublishedGrandPrixId(eventRegistry2026, ids), 'bahrain-2026')
})

test('scheduled workflow uses verified FP1, generic 24-hour cron and guarded preflight', async () => {
  const workflow = await readFile(new URL('../.github/workflows/fia-auto-publish.yml', import.meta.url), 'utf8')
  assert.match(workflow, /scheduled\.mjs --resolution=ingestion\/output\/calendar\/watch-event\.json --publish=true/)
  assert.match(workflow, /--preflight=true/)
  assert.match(workflow, /needs_pipeline == 'true'/)
  assert.match(workflow, /contents: write/)
  assert.match(workflow, /cron: '17,47 \* \* \* \*'/)
  const runner = await readFile(new URL('../ingestion/fia/backfill.mjs', import.meta.url), 'utf8')
  assert.match(runner, /status: 'NO_DOCUMENT_FOUND'/)
  assert.match(runner, /results.some\(\(\{ status \}\) => status === 'ERROR'\)/)
})

test('all historical datasets use the strict reconstructed source contract', async () => {
  const { readdir } = await import('node:fs/promises')
  const directory = new URL('../public/data/grands-prix/2026/', import.meta.url)
  for (const file of (await readdir(directory)).filter(f=>f.endsWith('.json'))) {
    const dataset=JSON.parse(await readFile(new URL(file,directory),'utf8'))
    assert.equal(dataset.parserVersion,'fia-table-v4',file)
    assert.ok(dataset.updates.every(row=>row.sourcePage && row.sourceTeamHeading),file)
  }
})

test('real runner treats no document as success and preserves an existing dataset', async () => {
  const { execFile } = await import('node:child_process')
  const { promisify } = await import('node:util')
  const { fileURLToPath } = await import('node:url')
  const directory = await mkdtemp(join(tmpdir(), 'fia-empty-run-'))
  const target = join(directory, 'existing.json')
  const prior = '{"existing":"preserved"}\n'
  await writeFile(target, prior)
  try {
    const preload = 'data:text/javascript,' + encodeURIComponent('globalThis.fetch = async () => new Response("<div class=event-title>Bahrain Grand Prix</div>")')
    const { stdout } = await promisify(execFile)(process.execPath, ['--import', preload, fileURLToPath(new URL('../ingestion/fia/run.mjs', import.meta.url)), '--index-url=https://www.fia.com/documents/season/2026/event/Bahrain%20Grand%20Prix', '--grand-prix=bahrain-2026', '--event-name=Bahrain Grand Prix', '--allow-empty=true', '--publish=true', '--publish-output=' + target], { cwd: directory })
    assert.equal(JSON.parse(stdout).status, 'NO_DOCUMENT_FOUND')
    assert.equal(await readFile(target, 'utf8'), prior)
  } finally { await rm(directory, { recursive: true, force: true }) }
})


test('painted borders preserve merged cells while headerless continuations require review', async () => {
  const extraction = JSON.parse(await readFile(new URL('./fixtures/fia-merged-continuation-layout.json', import.meta.url), 'utf8'))
  const parsed = parsePresentationText(extraction, { documentId: 'merged', grandPrixId: 'azerbaijan-2026', season: 2026 })
  assert.equal(parsed.records.length, 17)
  assert.equal(parsed.rejected.length, 8)
  assert.ok(parsed.rejected.every(row=>row.reason==='unmapped_team' && !row.sourceTeamHeading))
  const audi = parsed.records.filter(({ teamId }) => teamId === 'audi')
  assert.equal(audi.length, 7)
  for (const group of [[0,1,2], [4,5,6]]) {
    for (const i of group) {
      assert.equal(audi[i].primaryReason, audi[group[0]].primaryReason)
      assert.equal(audi[i].geometricDifference, audi[group[0]].geometricDifference)
      assert.equal(audi[i].briefDescription, audi[group[0]].briefDescription)
    }
  }
  assert.match(audi[0].briefDescription, /the new package\.$/)
})

test('extractor keeps painted table borders in text coordinates and excludes clipping/backgrounds', async () => {
  const { OPS } = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const lines = extractTableLines({
    fnArray: [OPS.save, OPS.transform, OPS.constructPath, OPS.constructPath, OPS.constructPath, OPS.restore, OPS.constructPath],
    argsArray: [null, [1,0,0,1,10,20], [OPS.fill, [], [0,0,100,.5]], [OPS.endPath, [], [0,0,100,.5]], [OPS.fill, [], [0,0,100,100]], null, [OPS.fill, [], [3,4,3.5,44]]],
  })
  assert.deepEqual(lines.horizontal, [{ x1:10, x2:110, y:20.25 }])
  assert.deepEqual(lines.vertical, [{ x:3.25, y1:4, y2:44 }])
})

