import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { prepareFamilyDetails } from '../src/features/garage/presentation.mjs'
import { localizeFiaUpdate } from '../src/services/fia/localization.mjs'
const content = u => u.content
const row = (number, geometry, description, componentId = 'floor') => ({ componentId, fiaRecord: { sourceRowNumber: number }, content: { presentedComponent: `Part ${number}`, primaryReason: 'Shared reason', geometricDifference: geometry, description } })
test('FIA order, stable missing/tied rows and input immutability', () => {
  const input = [row(undefined, 'a', 'a'), row(2, 'b', 'b'), row(1, 'c', 'c'), row(2, 'd', 'd'), row(undefined, 'e', 'e')]
  const before = structuredClone(input)
  const result = prepareFamilyDetails(input, content)
  assert.deepEqual(result.rows.map(r => r.content.geometricDifference), ['c', 'b', 'd', 'a', 'e'])
  assert.deepEqual(result.rows.map(r => r.number), [1, 2, 3, 4, 5])
  assert.deepEqual(input, before)
})
test('partial sharing retains unique Floor and Rear Wing fields and exact strings', () => {
  for (const family of ['floor', 'rearWing']) {
    const result = prepareFamilyDetails([row(3, 'Distinct', 'Unique', family), row(1, 'Same', 'Text', family), row(2, 'Same', 'Text ', family)], content)
    assert.deepEqual(result.shared.map(s => [s.field, s.numbers]), [['primaryReason', [1, 2, 3]], ['geometricDifference', [1, 2]]])
    assert.equal(result.rows[2].specific.geometricDifference, 'Distinct')
    assert.deepEqual(result.rows.map(r => r.specific.description), ['Text', 'Text ', 'Unique'])
  }
})
test('never share across families or text-only updates; singleton retains all fields', () => {
  const input = [row(1, 'Same', 'Text'), row(2, 'Same', 'Text', 'nose')]
  assert.equal(prepareFamilyDetails(input, content).shared.length, 0)
  assert.equal(prepareFamilyDetails([row(1, 'Same', 'Text', null), row(2, 'Same', 'Text', null)], content).shared.length, 0)
  const single = prepareFamilyDetails(input.slice(0, 1), content)
  assert.deepEqual(single.rows[0].specific, input[0].content)
})
test('published Audi Azerbaijan: Front Wing, Floor, Rear Wing and independent Nose, ES/EN', async () => {
  const dataset = JSON.parse(await readFile(new URL('../public/data/grands-prix/2026/azerbaijan-2026.json', import.meta.url)))
  for (const locale of ['es', 'en']) {
    const toContent = u => { const c = localizeFiaUpdate(u.fiaRecord, locale); return { presentedComponent: c.componentName, primaryReason: c.primaryReason, geometricDifference: c.geometricDifference, description: c.briefDescription } }
    for (const family of ['front-wing', 'floor', 'rear-wing']) {
      const records = dataset.updates.filter(u => u.teamId === 'audi' && u.componentId === family)
      const result = prepareFamilyDetails(records.toReversed().map(u => ({ componentId: family, fiaRecord: u })), toContent)
      assert.equal(result.rows.length, 2)
      assert.ok(result.rows[0].update.fiaRecord.sourceRowNumber < result.rows[1].update.fiaRecord.sourceRowNumber)
      assert.equal(result.shared.length, 3)
      assert.ok(result.rows.every(r => !r.specific.primaryReason && !r.specific.geometricDifference && !r.specific.description))
    }
    const nose = dataset.updates.find(u => u.teamId === 'audi' && u.componentId === 'nose')
    const result = prepareFamilyDetails([{ componentId: 'nose', fiaRecord: nose }], toContent)
    assert.equal(result.shared.length, 0)
    assert.ok(result.rows[0].specific.description)
    assert.ok(result.rows[0].specific.geometricDifference)
    assert.ok(result.rows[0].specific.primaryReason)
  }
})

test('real published Floor and Rear Wing families preserve differing values', async () => {
  const { readdir } = await import('node:fs/promises')
  const directory = new URL('../public/data/grands-prix/2026/', import.meta.url)
  const found = new Set()
  for (const file of await readdir(directory)) {
    if (!file.endsWith('.json')) continue
    const dataset = JSON.parse(await readFile(new URL(file, directory)))
    for (const family of ['floor', 'rear-wing']) {
      if (found.has(family)) continue
      for (const team of new Set(dataset.updates.map(u => u.teamId))) {
        const records = dataset.updates.filter(u => u.teamId === team && u.componentId === family)
        if (records.length < 2) continue
        const toContent = u => ({ presentedComponent: u.fiaRecord.componentName, primaryReason: u.fiaRecord.primaryReason, geometricDifference: u.fiaRecord.geometricDifference, description: u.fiaRecord.briefDescription })
        if (!['geometricDifference', 'briefDescription'].some(field => new Set(records.map(u => u[field]).filter(Boolean)).size > 1)) continue
        const result = prepareFamilyDetails(records.map(u => ({ componentId: family, fiaRecord: u })), toContent)
        for (const row of result.rows) for (const field of ['primaryReason', 'geometricDifference', 'description']) {
          const original = row.content[field]
          if (original) assert.ok(row.specific[field] === original || result.shared.some(s => s.field === field && s.value === original && s.numbers.includes(row.number)))
        }
        found.add(family)
        console.log(`Verified ${file}: ${team} ${family}`)
        break
      }
    }
  }
  assert.deepEqual([...found].sort(), ['floor', 'rear-wing'])
})
