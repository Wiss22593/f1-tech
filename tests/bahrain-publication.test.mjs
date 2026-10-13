import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { matchesEventName } from '../ingestion/fia/event-matching.mjs'
import { fetchFiaDocumentIndex, resolveFiaEventIndex } from '../ingestion/fia/finder.mjs'
import { reconcileCalendar } from '../ingestion/fia/official-calendar.mjs'
import { eventRegistry2026 } from '../ingestion/fia/events.mjs'
import { validateAutoPublishDataset } from '../ingestion/fia/auto-publish.mjs'
import { selectLatestPublishedGrandPrixId } from '../src/services/fia/latest-published.mjs'
import { selectPublishedGarageGrandPrix } from '../src/features/garage/presentation.mjs'
const event = eventRegistry2026.find(e => e.id === 'bahrain-2026')
const aliases = ['Bahrain Grand Prix', 'Bahrain Grand Prix in Malaysia', 'Malaysia', 'Sepang']
const seasonUrl = 'https://www.fia.com/documents/championships/fia-formula-one-world-championship-14/season/season-2026-2072'
for (const alias of aliases) {
  test(`2026 Bahrain identity accepts only scoped exact alias: ${alias}`, async () => {
    assert.equal(matchesEventName(event, alias), true)
    if (alias !== event.eventName) {
      assert.equal(matchesEventName({ ...event, season: 2027, id: 'bahrain-2027' }, alias), false)
      assert.equal(matchesEventName({ ...event, id: 'another-2026' }, alias), false)
    }
    const path = `${seasonUrl}/event/${encodeURIComponent(alias)}`
    assert.equal(await resolveFiaEventIndex({ ...event, indexUrl: null }, { fetchFn: async () => new Response(`<option value="${path}">${alias}</option>`) }), path)
    const result = await fetchFiaDocumentIndex({ indexUrl: path, grandPrixId: event.id, season: 2026, eventName: event.eventName, fetchFn: async () => new Response(`<div class="event-title">${alias}</div><a href="/official.pdf">Doc 12 - Car Presentation Submissions</a><div class="event-title">Singapore Grand Prix</div><a href="/wrong.pdf">Doc 12 - Car Presentation Submissions</a>`) })
    assert.deepEqual(result.map(d => [d.eventId, d.documentId, d.sourceUrl]), [['bahrain-2026', '12', 'https://www.fia.com/official.pdf']])
    const calendar = reconcileCalendar([event], [{ eventName: alias, circuit: event.circuit, status: 'scheduled' }], [{ slug: event.f1Slug ?? 'bahrain', startDate: event.startDate, endDate: event.endDate }])
    assert.equal(calendar.events[0].id, 'bahrain-2026')
    assert.deepEqual(calendar.diagnostics, [])
  })
}
test('near matches and ambiguous event identities cannot select a PDF', async () => {
  for (const name of ['Malaysia Grand Prix', 'Sepang test', 'Bahrain Grand Prix 2027', 'Singapore Grand Prix']) assert.equal(matchesEventName(event, name), false)
  await assert.rejects(resolveFiaEventIndex({ ...event, indexUrl: null }, { fetchFn: async () => new Response(aliases.slice(0,2).map(a=>`<option value="${seasonUrl}/event/${encodeURIComponent(a)}">${a}</option>`).join('')) }), /manual_review/)
  await assert.rejects(fetchFiaDocumentIndex({ indexUrl: event.indexUrl, grandPrixId: event.id, season: 2026, eventName: event.eventName, fetchFn: async () => new Response('<div class="event-title">Bahrain Grand Prix</div><div class="event-title">Sepang</div>') }), /manual_review/)
})
test('official Doc 12 publishes fourteen factual rows and becomes the default latest GP', async () => {
  const dataset = JSON.parse(await readFile(new URL('../public/data/grands-prix/2026/bahrain-2026.json', import.meta.url)))
  assert.equal(validateAutoPublishDataset(dataset, 'public/data/grands-prix/2026/bahrain-2026.json').valid, true)
  assert.equal(dataset.sourceDocument.documentId, '12')
  assert.equal(dataset.sourceDocument.sourceUrl, 'https://www.fia.com/system/files/decision-document/2026_bahrain_grand_prix_in_malaysia_-_car_presentation_submissions.pdf')
  assert.deepEqual(dataset.validation, { recordsReceived: 14, recordsPublished: 14, manualReview: 0 })
  assert.deepEqual(dataset.updates.reduce((counts,row)=>(counts[row.teamId]=(counts[row.teamId]??0)+1,counts),{}), { mclaren: 1, mercedes: 7, 'red-bull-racing': 1, ferrari: 1, 'racing-bulls': 2, haas: 1, alpine: 1 })
  const ids = new Set(['azerbaijan-2026', dataset.grandPrix.id])
  assert.equal(selectLatestPublishedGrandPrixId(eventRegistry2026, ids), 'bahrain-2026')
  assert.equal(selectPublishedGarageGrandPrix(eventRegistry2026, ids, 2026), 'bahrain-2026')
  assert.equal(selectPublishedGarageGrandPrix(eventRegistry2026, ids, 2026, 'azerbaijan-2026'), 'azerbaijan-2026')
})

