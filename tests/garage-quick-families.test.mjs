import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { quickUpdateFamilies } from '../src/features/garage/presentation.mjs'
import { localizeFiaUpdate } from '../src/services/fia/localization.mjs'
const records = name => JSON.parse(readFileSync(new URL('../public/data/grands-prix/2026/' + name, import.meta.url))).updates
const adapt = record => ({ id: record.id, componentId: record.visualizable === false ? null : record.componentId, fiaRecord: record })
test('Mercedes Bahrain retains floor, rear suspension and both text-only families', () => {
 const updates = records('bahrain-2026.json').filter(r => r.teamId === 'mercedes').map(adapt)
 assert.equal(updates.length, 7)
 const families = quickUpdateFamilies(updates)
 assert.equal(families.length, 4)
 assert.equal(families.filter(r => r.componentId === 'floor').length, 1)
 assert.deepEqual(families.filter(r => !r.componentId).map(r => localizeFiaUpdate(r.fiaRecord, 'es').componentName), ['Conjunto trasero', 'Carrocería trasera'])
})
test('every published family remains represented for every team and GP', () => {
 for (const file of readdirSync(new URL('../public/data/grands-prix/2026/', import.meta.url)).filter(f => f.endsWith('.json'))) {
  const all = records(file)
  for (const team of new Set(all.map(r => r.teamId))) {
   const updates = all.filter(r => r.teamId === team).map(adapt)
   const key = r => r.componentId ?? r.fiaRecord.componentName.trim().replace(/\s+/g, ' ').toLowerCase()
   assert.deepEqual(new Set(quickUpdateFamilies(updates).map(key)), new Set(updates.map(key)), file + ':' + team)
  }
 }
})
test('text-only duplicates normalize whitespace and case without merging different names', () => {
 const updates = ['Rear Corner', ' rear   corner ', 'Rear Bodywork'].map((presentedComponent, i) => ({id: String(i), componentId: null, presentedComponent}))
 assert.deepEqual(quickUpdateFamilies(updates).map(r => r.id), ['0', '2'])
})
