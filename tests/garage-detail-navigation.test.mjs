import test from 'node:test'
import assert from 'node:assert/strict'
import { revealUpdateDetail } from '../src/features/garage/detail-navigation.mjs'
const fixture = () => {
  const scroll = [], focus = []
  const nodes = ['family-doc-1', 'family-doc-2', 'text-only'].map((id, index) => ({ dataset: { updateId: id }, getBoundingClientRect: () => ({ top: 300 + index * 100 }), focus: opts => focus.push([id, opts]) }))
  const container = { querySelectorAll: () => nodes, getBoundingClientRect: () => ({ top: 100 }), scrollTop: 80, scrollTo: opts => scroll.push(opts) }
  return { container, nodes, scroll, focus }
}
test('reveals exact document within a family using only the inspector, with accessible focus', () => {
  const { container, scroll, focus } = fixture()
  assert.equal(revealUpdateDetail(container, 'family-doc-2'), true)
  assert.deepEqual(scroll, [{ top: 372, behavior: 'smooth' }])
  assert.deepEqual(focus, [['family-doc-2', { preventScroll: true }]])
})
test('absent selection, missing document and closed inspector do not move or focus anything', () => {
  const { container, scroll, focus } = fixture()
  for (const id of [undefined, 'missing']) assert.equal(revealUpdateDetail(container, id), false)
  assert.equal(revealUpdateDetail(null, 'family-doc-1'), false)
  assert.deepEqual(scroll, []); assert.deepEqual(focus, [])
})
test('supports text-only records, reduced motion and clamps scroll at the start', () => {
  const { container, nodes, scroll, focus } = fixture()
  nodes[2].getBoundingClientRect = () => ({ top: 0 })
  assert.equal(revealUpdateDetail(container, 'text-only', true), true)
  assert.deepEqual(scroll, [{ top: 0, behavior: 'instant' }])
  assert.equal(focus[0][0], 'text-only')
})
