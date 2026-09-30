import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { hasPublishedUpdates, selectPublishedGarageGrandPrix, showComponentSubtitle } from '../src/features/garage/presentation.mjs'
import { remainingGrandPrixName } from '../src/i18n/remaining-grand-prix.mjs'
import { garageUpdateCount } from '../src/i18n/update-count.mjs'
import { publishedUpdateCounts } from '../src/services/fia/update-counts.mjs'

test('localized duplicate headings ignore case, trim and repeated whitespace in every language', () => {
  for (const label of ['Suspensión delantera', 'Front suspension', 'Sospensione anteriore', 'Suspension avant', 'Vorderradaufhängung', 'Suspensão dianteira']) {
    assert.equal(showComponentSubtitle(` ${label.toUpperCase()} `, ` ${label.replaceAll(' ', '  ')} `), false)
  }
  assert.equal(showComponentSubtitle('SUSPENSIÓN DELANTERA', 'Suspensio\u0301n delantera'), false)
  assert.equal(showComponentSubtitle('Unknown component', 'Unknown component'), false)
  assert.equal(showComponentSubtitle('Piso', null), false)
})
test('distinct component names retain useful detail under their grouping', () => {
  assert.equal(showComponentSubtitle('PONTONES', 'Entrada del pontón'), true)
  assert.equal(showComponentSubtitle('Floor', 'Floor furniture'), true)
  assert.equal(showComponentSubtitle('Front suspension', 'Front suspension fairing'), true)
})
const events = [{ id: 'old-2026', season: 2026, startDate: '2026-03-01' }, { id: 'az-2026', season: 2026, startDate: '2026-09-24' }, { id: 'bahrain-2026', season: 2026, startDate: '2026-10-02' }, { id: 'old-2027', season: 2027, startDate: '2027-03-01' }]
const published = new Set(['old-2026', 'az-2026'])
test('availability requires factual published rows, regardless of date or hotspot', () => {
  assert.equal(hasPublishedUpdates(null), false)
  assert.equal(hasPublishedUpdates({ grandPrix: { id: 'gp' }, updates: [] }), false)
  assert.equal(hasPublishedUpdates({ grandPrix: { id: 'gp' }, updates: [{ grandPrixId: 'gp', validationState: 'validated' }] }), false)
  assert.equal(hasPublishedUpdates({ grandPrix: { id: 'gp' }, updates: [{ grandPrixId: 'other', validationState: 'published' }] }), false)
  assert.equal(hasPublishedUpdates({ grandPrix: { id: 'gp' }, updates: [{ grandPrixId: 'gp', validationState: 'published', componentId: null, visualizable: false }] }), true)
})
test('unavailable URL falls back to latest published of the same season; historical links survive', () => {
  assert.equal(selectPublishedGarageGrandPrix(events, published, 2026, 'bahrain-2026'), 'az-2026')
  assert.equal(selectPublishedGarageGrandPrix(events, published, 2026, 'old-2026'), 'old-2026')
  assert.equal(selectPublishedGarageGrandPrix(events, published, 2026), 'az-2026')
  assert.equal(selectPublishedGarageGrandPrix(events, published, 2027, 'az-2026'), null)
})
test('newly published GP automatically becomes latest without a hardcoded current GP', () => {
  assert.equal(selectPublishedGarageGrandPrix(events, new Set([...published, 'bahrain-2026']), 2026), 'bahrain-2026')
})
test('all missing Spanish calendar labels use product nomenclature, including Sepang identity', () => {
  const names = { bahrain: 'BAHRÉIN', 'saudi-arabia': 'ARABIA SAUDITA', singapore: 'SINGAPUR', 'united-states': 'ESTADOS UNIDOS', 'mexico-city': 'CIUDAD DE MÉXICO', 'sao-paulo': 'SÃO PAULO', 'las-vegas': 'LAS VEGAS', qatar: 'QATAR', 'abu-dhabi': 'ABU DABI' }
  for (const [id, name] of Object.entries(names)) {
    assert.equal(remainingGrandPrixName('es', `${id}-2026`), `GRAN PREMIO DE ${name} 2026`)
    for (const locale of ['en', 'it', 'pt', 'fr', 'de']) assert.ok(remainingGrandPrixName(locale, `${id}-2026`))
  }
  assert.equal(remainingGrandPrixName('es', 'bahrain-2027'), 'GRAN PREMIO DE BAHRÉIN 2027')
  assert.equal(remainingGrandPrixName('es', 'unknown-2026'), null)
})
test('counter keeps zero, singular and plural without leading zero and counts text-only factual rows', () => {
  assert.equal(garageUpdateCount('es', 0), 'SIN ACTUALIZACIONES')
  assert.equal(garageUpdateCount('es', 1), '1 ACTUALIZACIÓN')
  assert.equal(garageUpdateCount('es', 8), '8 ACTUALIZACIONES')
  assert.deepEqual(publishedUpdateCounts([{ teamId: 'audi', grandPrixId: 'gp', validationState: 'published', componentId: null, visualizable: false }, { teamId: 'audi', grandPrixId: 'gp', validationState: 'published', componentId: 'unknown' }, { teamId: 'audi', grandPrixId: 'gp', validationState: 'manual_review' }], 'gp'), { audi: 2 })
})
test('real dataset availability accepts Azerbaijan and Madrid despite registry status; future Bahrain is absent', async () => {
  for (const id of ['azerbaijan-2026', 'madrid-grand-prix-2026']) assert.equal(hasPublishedUpdates(JSON.parse(await readFile(new URL(`../public/data/grands-prix/2026/${id}.json`, import.meta.url)))), true)
  await assert.rejects(readFile(new URL('../public/data/grands-prix/2026/bahrain-2026.json', import.meta.url)), { code: 'ENOENT' })
})
