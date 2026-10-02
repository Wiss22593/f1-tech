import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'
import { prepareDevelopmentSession } from '../src/app/development-session.mjs'

const origin = 'http://localhost:5173'
const worker = { scriptURL: `${origin}/sw.js` }
function session({ controlled = true, own = true } = {}) {
  const removed = [], cleared = []
  let reloads = 0
  const registration = { active: own ? worker : { scriptURL: `${origin}/another-app.js` }, unregister: async () => { removed.push('registration'); return true } }
  return {
    navigator: { serviceWorker: { controller: controlled ? registration.active : null, getRegistrations: async () => [registration] } },
    caches: { keys: async () => ['f1-tech-shell-v2', 'f1-tech-shell-v3', 'another-app'], delete: async name => { cleared.push(name); return true } },
    location: { origin, reload: () => { reloads++; assert.equal(removed.length, 1); assert.equal(cleared.length, 2) } },
    removed, cleared, reloads: () => reloads,
  }
}
test('dev removes its controlling shell worker and stale modules before exactly one reload', async () => {
  const env = session()
  assert.equal(await prepareDevelopmentSession(env), false)
  assert.deepEqual(env.cleared, ['f1-tech-shell-v2', 'f1-tech-shell-v3'])
  assert.equal(env.reloads(), 1)
  env.navigator.serviceWorker.controller = null
  env.navigator.serviceWorker.getRegistrations = async () => []
  assert.equal(await prepareDevelopmentSession(env), true)
  assert.equal(env.reloads(), 1)
})
test('dev removes an inactive own registration without reload or touching other apps', async () => {
  const env = session({ controlled: false })
  assert.equal(await prepareDevelopmentSession(env), true)
  assert.equal(env.reloads(), 0)
  const other = session({ own: false })
  assert.equal(await prepareDevelopmentSession(other), true)
  assert.deepEqual(other.removed, [])
  assert.deepEqual(other.cleared, [])
})
test('dev starts normally when service workers are unavailable', async () => {
  assert.equal(await prepareDevelopmentSession({ navigator: {}, location: { origin } }), true)
})
test('installed worker never serves cached Vite modules, but retains production shell policy', async () => {
  const handlers = {}, source = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8')
  let cacheReads = 0
  runInNewContext(source, {
    self: { location: { origin }, addEventListener: (type, fn) => { handlers[type] = fn } }, URL,
    caches: { match: async () => { cacheReads++; return { ok: true, text: async () => 'old revision' } } },
    fetch: async () => ({ ok: false }),
  })
  for (const path of ['/src/three/component-isolation.mjs', '/src/three/component-mesh-map.json?import', '/src/three/authored-livery.mjs', '/node_modules/.vite/deps/three.js?v=old', '/@vite/client', '/@react-refresh', '/@fs/project/file.js', '/@id/module']) {
    let intercepted = false
    handlers.fetch({ request: { method: 'GET', url: origin + path, destination: 'script' }, respondWith: () => { intercepted = true } })
    assert.equal(intercepted, false, path)
  }
  assert.equal(cacheReads, 0)
  let response
  handlers.fetch({ request: { method: 'GET', url: origin + '/assets/garage-hash.js', destination: 'script' }, respondWith: value => { response = value } })
  assert.equal(await (await response).text(), 'old revision')
  assert.equal(cacheReads, 1)
})
