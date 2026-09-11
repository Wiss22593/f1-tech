import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeComponent, normalizeTeam } from '../ingestion/fia/normalizer.mjs'
import { findDuplicateRecordIds, validateUpdate } from '../ingestion/fia/validator.mjs'
import { fetchFiaDocumentIndex, isPresentationTitle } from '../ingestion/fia/finder.mjs'
import { parsePresentationText } from '../ingestion/fia/parser.mjs'
import { extractPdfText } from '../ingestion/fia/extractor.mjs'
import { mapFiaComponent, suggestFiaComponents } from '../ingestion/fia/component-registry.mjs'
import { createPublicationPlan, publicationDecision } from '../ingestion/fia/publication.mjs'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { eventRegistry2026, selectCurrentEvents, selectIngestionWindowEvents } from '../ingestion/fia/events.mjs'
import { buildDataChangePlan } from '../ingestion/fia/prepare-pr.mjs'
import { buildAutoPublishChangePlan, validateAutoPublishDataset } from '../ingestion/fia/auto-publish.mjs'
import { JolpicaChampionshipProvider } from '../ingestion/championship/jolpica.mjs'
import { resolveChampionshipSource } from '../ingestion/championship/source-config.mjs'

const valid = {
  id: 'monza-mercedes-rear-wing', grandPrixId: 'italian-grand-prix-2026', teamId: 'mercedes', componentId: 'rear wing',
  source: 'FIA', sourceUrl: 'https://www.fia.com/document.pdf', sourceDocument: 'Car Presentation Submissions', sourceText: 'Revised rear wing geometry.', description: 'Revised rear wing geometry.',
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
  assert.equal(validateUpdate({ ...valid, description: '' }, ['italian-grand-prix-2026']).valid, false)
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

test('parser fixture preserves source text and leaves unsupported editorial fields null', async () => {
  const text = await readFile(new URL('./fixtures/fia-presentation.txt', import.meta.url), 'utf8')
  const parsed = parsePresentationText(text, { documentId: 'doc-10', season: 2026, grandPrixId: 'italian-grand-prix-2026', sourceDocument: 'Car Presentation Submissions', sourceUrl: valid.sourceUrl, contentHash: 'a'.repeat(64) })
  assert.equal(parsed.rejected.length, 0)
  assert.equal(parsed.records.length, 1)
  assert.equal(parsed.records[0].teamId, 'mercedes')
  assert.equal(parsed.records[0].componentId, 'rear-wing')
  assert.equal(parsed.records[0].magnitude, null)
  assert.equal(parsed.records[0].area, null)
  assert.match(parsed.records[0].sourceText, /Revised winglet geometry/)
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
    assert.deepEqual(extracted.extractionWarnings, [])
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('canonical 2026 registry contains all 24 official calendar rounds', () => {
  assert.equal(eventRegistry2026.length, 24)
  assert.equal(new Set(eventRegistry2026.map(({ id }) => id)).size, 24)
  assert.equal(eventRegistry2026.filter(({ indexUrl }) => indexUrl).length, 14)
})

test('current event discovery selects Madrid during its verified race window', () => {
  assert.deepEqual(selectCurrentEvents(eventRegistry2026, new Date('2026-09-12T12:00:00Z')).map(({ id }) => id), ['madrid-grand-prix-2026'])
})

test('scheduled auto-publication uses the Buenos Aires GP window and exits early otherwise', () => {
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
  for (const page of ['technical-preview/TechnicalPreview.tsx', 'updates/UpdatesPage.tsx', 'teams/TeamsPage.tsx']) {
    const source = await readFile(new URL(`../src/features/${page}`, import.meta.url), 'utf8')
    assert.match(source, /navigator\.onLine \? 'stale' : 'offline'/)
  }
})
