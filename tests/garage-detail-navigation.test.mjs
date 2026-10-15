import test from 'node:test'
import assert from 'node:assert/strict'
import { revealUpdateDetail } from '../src/features/garage/detail-navigation.mjs'
const fixture = () => {
  const scroll = [], focus = []
  const row = { getBoundingClientRect: () => ({ top: 240 }), focus: opts => focus.push(opts) }
  const family = { querySelector: selector => selector === '.showroom-piece' ? row : null }
  const textRow = { getBoundingClientRect: () => ({ top: 440 }) }
  const nodes = ['family-doc-1', 'family-doc-2', 'text-only'].map((id, index) => ({
    dataset: { updateId: id },
    getBoundingClientRect: () => ({ top: 300 + index * 100 }),
    closest: selector => selector === '.showroom-component' ? (index < 2 ? family : { querySelector: () => textRow }) : null,
    focus: opts => focus.push(opts),
  }))
  const container = { querySelectorAll: () => nodes, getBoundingClientRect: () => ({ top: 100 }), scrollTop: 80, scrollTo: opts => scroll.push(opts) }
  return { container, nodes, row, textRow, scroll, focus }
}

test('reveals the selectable family row above the document, without moving focus', () => {
  const { container, scroll, focus } = fixture()
  assert.equal(revealUpdateDetail(container, 'family-doc-2'), true)
  assert.deepEqual(scroll, [{ top: 212, behavior: 'smooth' }])
  assert.deepEqual(focus, [])
})
test('switching documents in the same family keeps its row as the destination', () => {
  const { container, scroll } = fixture()
  revealUpdateDetail(container, 'family-doc-1')
  revealUpdateDetail(container, 'family-doc-2')
  assert.deepEqual(scroll.map(item => item.top), [212, 212])
})
test('absent selection, missing document and closed inspector do not move anything', () => {
  const { container, scroll, focus } = fixture()
  for (const id of [undefined, 'missing']) assert.equal(revealUpdateDetail(container, id), false)
  assert.equal(revealUpdateDetail(null, 'family-doc-1'), false)
  assert.deepEqual(scroll, []); assert.deepEqual(focus, [])
})
test('supports text-only rows, reduced motion and clamps scroll at the start', () => {
  const { container, textRow, scroll, focus } = fixture()
  textRow.getBoundingClientRect = () => ({ top: 0 })
  assert.equal(revealUpdateDetail(container, 'text-only', true), true)
  assert.deepEqual(scroll, [{ top: 0, behavior: 'instant' }])
  assert.deepEqual(focus, [])
})
test('does not fall back to scrolling the article when its selectable row is absent', () => {
  const { container, nodes, scroll } = fixture()
  nodes[0].closest = () => null
  assert.equal(revealUpdateDetail(container, 'family-doc-1'), false)
  assert.deepEqual(scroll, [])
})
