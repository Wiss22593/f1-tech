import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { fiaLocalizationSourceKey, localizeFiaUpdate } from '../src/services/fia/localization.mjs'

const directory = new URL('../public/data/grands-prix/2026/', import.meta.url)
const files = (await readdir(directory)).filter(file => file.endsWith('.json'))
const datasets = await Promise.all(files.map(async file => JSON.parse(await readFile(new URL(file, directory), 'utf8'))))
const catalogue = JSON.parse(await readFile(new URL('../src/data/fia-localization/es.json', import.meta.url), 'utf8'))
// New GP datasets remain publishable: reviewed baseline coverage is checked here,
// while unseen sentences use the explicitly tested pending presentation.
const records = datasets.flatMap(dataset => dataset.updates).filter(record => Object.hasOwn(catalogue, record.id))
const az = records.filter(record => record.grandPrixId === 'azerbaijan-2026')
const madrid = records.filter(record => record.grandPrixId === 'madrid-grand-prix-2026')
const fields = ['componentName', 'primaryReason', 'geometricDifference', 'briefDescription']
const counts = rows => Object.fromEntries([...new Set(rows.map(row => row.teamId))].map(team => [team, rows.filter(row => row.teamId === team).length]))

function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value) }
  return value
}

function original(record) {
  return {
    componentName: record.componentName ?? null,
    primaryReason: record.primaryReason ?? record.category ?? null,
    geometricDifference: record.geometricDifference ?? null,
    briefDescription: record.briefDescription ?? record.description ?? record.sourceText ?? null,
    componentLabel: record.componentName ?? record.componentId ?? '—',
    summary: record.objective ?? record.sourceText,
    complete: true,
    missingFields: [],
  }
}

test('all reviewed published records have Spanish copy bound to their current English source', () => {
  assert.ok(records.length >= 218)
  assert.equal(new Set(records.map(record => record.id)).size, records.length)
  assert.deepEqual(Object.keys(catalogue).sort(), records.map(record => record.id).sort())
  for (const record of records) {
    assert.equal(catalogue[record.id].sourceKey, fiaLocalizationSourceKey(record), record.id)
    const es = localizeFiaUpdate(record, 'es')
    assert.equal(es.complete, true, record.id)
    assert.deepEqual(es.missingFields, [])
    assert.ok(es.componentName && es.briefDescription, record.id)
    for (const field of fields) assert.equal(es[field], catalogue[record.id].es[field], `${record.id}: ${field}`)
    assert.doesNotMatch(es.summary, /Traducción al español pendiente|Performance|Flow Conditioning|Revised|Car Presentation|The /)
  }
})

test('all 38 Azerbaijan rows, across all six teams, expose all four Spanish fields', () => {
  assert.equal(az.length, 38)
  assert.deepEqual(counts(az), { mclaren: 8, 'red-bull-racing': 5, williams: 5, 'racing-bulls': 3, audi: 14, cadillac: 3 })
  for (const record of az) {
    const es = localizeFiaUpdate(record, 'es')
    for (const field of fields) {
      assert.ok(es[field], `${record.id}: ${field}`)
      if (record[field] !== 'Halo') assert.notEqual(es[field], record[field], `${record.id}: ${field}`)
    }
  }
})

test('McLaren sidepod translates the complete FIA presentation without adding claims', () => {
  const es = localizeFiaUpdate(az[0], 'es')
  assert.deepEqual(Object.fromEntries(fields.map(field => [field, es[field]])), {
    componentName: 'Entrada del pontón',
    primaryReason: 'Rendimiento - Acondicionamiento del flujo',
    geometricDifference: 'Forma revisada de la entrada del pontón',
    briefDescription: 'La entrada del pontón ha sido revisada con el objetivo de mejorar el acondicionamiento del flujo hacia la parte trasera del coche y, con ello, el rendimiento aerodinámico.',
  })
})

test('EN preserves the original four columns and each page’s English source summary', () => {
  for (const record of records) assert.deepEqual(localizeFiaUpdate(record, 'en'), original(record), record.id)
})

test('IT, PT, FR and DE preserve the existing English FIA fallback', () => {
  for (const locale of ['it', 'pt', 'fr', 'de']) {
    for (const record of records) assert.deepEqual(localizeFiaUpdate(record, locale), original(record), `${locale}: ${record.id}`)
  }
})

test('ES → EN → ES leaves every original field, URL, ID, hash and publication state untouched', () => {
  const snapshot = structuredClone(records)
  freeze(records)
  for (const record of records) {
    const first = localizeFiaUpdate(record, 'es')
    localizeFiaUpdate(record, 'en')
    assert.deepEqual(localizeFiaUpdate(record, 'es'), first)
    first.briefDescription = 'Only the returned view was changed'
    assert.notEqual(localizeFiaUpdate(record, 'es').briefDescription, first.briefDescription)
  }
  assert.deepEqual(records, snapshot)
  assert.equal(records.length, 218)
  assert.equal(az.length, 38)
  assert.equal(madrid.length, 10)
})

test('Madrid retains ten published rows, Mercedes three and Red Bull Racing two', () => {
  assert.equal(madrid.length, 10)
  assert.equal(counts(madrid).mercedes, 3)
  assert.equal(counts(madrid)['red-bull-racing'], 2)
  assert.ok(madrid.every(row => row.validationState === 'published'))
  const row = madrid.find(row => row.teamId === 'mclaren')
  assert.equal(localizeFiaUpdate(row, 'es').geometricDifference, 'Elementos adicionales del alerón trasero')
  assert.deepEqual(localizeFiaUpdate(row, 'en'), original(row))
})

test('rows without a hotspot receive complete translations without becoming visualizable', () => {
  const rows = az.filter(row => row.visualizable === false)
  assert.equal(rows.length, 8)
  for (const row of rows) {
    assert.equal(localizeFiaUpdate(row, 'es').complete, true)
    for (const field of fields) assert.ok(localizeFiaUpdate(row, 'es')[field])
    assert.equal(row.visualizable, false)
    assert.equal(row.componentId, null)
  }
})

test('legacy records translate their complete source block without inventing separate columns', () => {
  const legacy = records.filter(row => !row.componentName)
  assert.equal(legacy.length, 170)
  for (const row of legacy) {
    const es = localizeFiaUpdate(row, 'es')
    assert.equal(es.primaryReason, null)
    assert.equal(es.geometricDifference, null)
    assert.ok(es.briefDescription)
    assert.equal(localizeFiaUpdate(row, 'en').briefDescription, row.description ?? row.sourceText)
  }
})

test('future publications can reuse only exact reviewed phrases without changing English', () => {
  const future = { ...az[0], id: 'sepang-new-id', grandPrixId: 'sepang-2026', contentHash: 'b'.repeat(64) }
  assert.deepEqual(localizeFiaUpdate(future, 'es'), localizeFiaUpdate(az[0], 'es'))
  assert.deepEqual(localizeFiaUpdate(future, 'en'), original(future))
})

test('new or changed technical sentences show explicit Spanish pending copy instead of stale or invented translations', () => {
  for (const id of [az[0].id, 'bahrain-new-id']) {
    const row = { ...az[0], id, geometricDifference: 'A previously unpublished geometry.', briefDescription: 'A previously unpublished technical explanation.', sourceText: 'New original FIA source block.' }
    const es = localizeFiaUpdate(row, 'es')
    assert.equal(es.complete, false)
    assert.deepEqual(es.missingFields, ['geometricDifference', 'briefDescription'])
    assert.equal(es.geometricDifference, 'Traducción al español pendiente.')
    assert.equal(es.briefDescription, 'Traducción al español pendiente.')
    assert.equal(es.componentName, 'Entrada del pontón')
    assert.deepEqual(localizeFiaUpdate(row, 'en'), original(row))
  }
})

test('all fifteen published datasets remain byte-identical after newline normalization', async () => {
  const hashes = JSON.parse(await readFile(new URL('./fixtures/published-localization-dataset-hashes.json', import.meta.url), 'utf8'))
  assert.ok(Object.keys(hashes).every(file => files.includes(file)))
  for (const [file, expected] of Object.entries(hashes)) {
    const text = (await readFile(new URL(file, directory), 'utf8')).replace(/\r\n/g, '\n')
    assert.equal(createHash('sha256').update(text).digest('hex'), expected, file)
  }
})
