import assert from 'node:assert/strict'
import test from 'node:test'
import { createHash } from 'node:crypto'
import { BufferAttribute, BufferGeometry, Group, Mesh, MeshStandardMaterial, Scene, Texture } from 'three'
import { createOptimizedCarLoader, withDriverAtlasBlob } from '../src/three/optimized-car-loader.mjs'
import { shouldUseOptimizedModels, optimizedModelDeliveryEnabled } from '../src/three/model-delivery-config.mjs'
import { acquireCar } from '../src/three/car-loader.mjs'

const settle = async () => { for (let i = 0; i < 16; i++) await Promise.resolve() }
function deferred() { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b }); return { promise, resolve, reject } }
function fakeClock() {
  let time = 0, id = 0
  const tasks = new Map()
  return {
    now: () => time,
    setTimer(fn, delay) { tasks.set(++id, { fn, at: time + delay }); return id },
    clearTimer(value) { tasks.delete(value) },
    async advance(ms = 0) {
      time += ms
      while (true) {
        const due = [...tasks].filter(([, task]) => task.at <= time).sort((a, b) => a[1].at - b[1].at)
        if (!due.length) break
        const [key, task] = due[0]; tasks.delete(key); task.fn(); await settle()
      }
      await settle()
    },
  }
}
function makeBase() {
  const scene = new Scene(), group = new Group(), associations = new Map()
  scene.name = 'Authored car'; group.name = 'Car root'; scene.add(group)
  for (let index = 0; index < 5; index++) {
    const geometry = new BufferGeometry().setAttribute('position', new BufferAttribute(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]), 3))
      .setAttribute('uv', new BufferAttribute(new Float32Array([0, 0, 1, 0, 0, 1]), 2))
      .setAttribute('uv1', new BufferAttribute(new Float32Array([0, 0, 1, 0, 0, 1]), 2)).setIndex([0, 1, 2])
    const material = new MeshStandardMaterial({ name: `Material ${index}`, color: 0x436587, metalness: .32, roughness: .67 })
    material.normalScale.set(-.3, .8); material.flatShading = true; material.vertexColors = true
    if (index === 4) { material.map = new Texture(); material.map.name = 'Shared immutable image' }
    const mesh = new Mesh(geometry, material); mesh.name = `Mesh ${index}`; mesh.position.x = index
    group.add(mesh); associations.set(mesh, { meshes: index === 0 ? 236 : index, primitives: 0 }); associations.set(material, { materials: index })
  }
  return { scene, scenes: [scene], parser: { associations, json: {} }, animations: [], cameras: [], asset: { version: '2.0' }, userData: {} }
}
function makeSkin(driver) {
  const map = new Texture(); map.name = driver.driverId; map.colorSpace = 'srgb'; map.flipY = false
  const materials = [0, 1, 2, 3].map(index => { const material = new MeshStandardMaterial({ name: `Material ${index}` }); material.map = map; return material })
  return { materials, resources: { materials: new Set(materials), textures: new Set([map]) } }
}
function meshes(result) { const values = []; result.scene.traverse(mesh => { if (mesh.isMesh) values.push(mesh) }); return values }
function setup(overrides = {}) {
  const clock = fakeClock(), base = makeBase(), loads = { base: [], skin: [], original: [], originalReleases: 0, patch: 0 }
  const patch = { path: '/models-optimized/alpine-uv1.bin', meshIndex: 236, primitiveIndex: 0, attribute: 'uv1', count: 3, componentType: 5126, sha256: createHash('sha256').update(new Uint8Array(new Float32Array([.2, .3, .8, .1, .4, .9]).buffer)).digest('hex') }
  const drivers = Object.fromEntries(['a', 'b', 'c', 'd', 'e', 'f'].map((id, index) => [`/models/${id}.glb`, { teamId: index < 2 ? 'mercedes' : 'other', driverId: id, skinPath: `/models-optimized/skin-${id}.gltf`, basePath: '/models-optimized/common.glb' }]))
  drivers['/models/alpine-a.glb'] = { ...drivers['/models/a.glb'], teamId: 'alpine', driverId: 'alpine-a', skinPath: '/models-optimized/skin-alpine-a.gltf', uvPatch: patch }
  drivers['/models/alpine-b.glb'] = { ...drivers['/models/alpine-a.glb'], driverId: 'alpine-b', skinPath: '/models-optimized/skin-alpine-b.gltf' }
  const manifest = { version: 1, base: { atlasMaterialIndices: [0, 1, 2, 3], textureRemap: [null] }, drivers }
  const options = {
    manifest, ...clock, idleMs: 25,
    loadBase: async path => { loads.base.push(path); return base },
    loadSkin: async (_base, driver) => { loads.skin.push(driver.driverId); return makeSkin(driver) },
    loadUVPatch: async () => { loads.patch++; return new Float32Array([.2, .3, .8, .1, .4, .9]).buffer },
    acquireOriginal(path) { loads.original.push(path); return { ready: Promise.resolve({ scene: new Scene(), original: path }), release() { loads.originalReleases++ } } },
    ...overrides,
  }
  return { clock, base, loads, loader: createOptimizedCarLoader(options), options }
}

test('the rollout is centralized and explicit query modes override it without requiring window', () => {
  assert.equal(shouldUseOptimizedModels(''), optimizedModelDeliveryEnabled)
  assert.equal(shouldUseOptimizedModels('?modelMode=original'), false)
  assert.equal(shouldUseOptimizedModels('?modelMode=optimized'), true)
  assert.equal(shouldUseOptimizedModels('?unrelated=1'), optimizedModelDeliveryEnabled)
})

test('custom acquireCar injection bypasses optimized routing and retains the original contract', async () => {
  let calls = 0
  const scene = new Scene(), a = acquireCar('/models/mercedes-w17-russell.glb', async () => { calls++; return { scene } })
  const b = acquireCar('/models/mercedes-w17-russell.glb', async () => { throw new Error('Duplicate original load') })
  assert.equal((await a.ready).scene, scene); assert.equal(await a.ready, await b.ready); assert.equal(calls, 1)
  a.release(); b.release(); await new Promise(resolve => setTimeout(resolve, 5))
})

test('active leases share one scene, preserve finalized material variants, and release only their owned resources', async () => {
  const { loader, clock, base, loads } = setup(), a = loader.acquire('/models/a.glb'), b = loader.acquire('/models/a.glb')
  const result = await a.ready
  assert.equal(result, await b.ready); assert.equal(loads.base.length, 1); assert.deepEqual(loads.skin, ['a'])
  const original = meshes(base), shown = meshes(result)
  for (let i = 0; i < shown.length; i++) {
    assert.notEqual(shown[i], original[i]); assert.equal(shown[i].geometry, original[i].geometry)
    assert.deepEqual(shown[i].matrix.toArray(), original[i].matrix.toArray())
    if (i < 4) {
      assert.notEqual(shown[i].material, original[i].material)
      assert.equal(shown[i].material.map.name, 'a'); assert.equal(original[i].material.map, null)
      assert.deepEqual(shown[i].material.normalScale.toArray(), [-.3, .8]); assert.equal(shown[i].material.flatShading, true); assert.equal(shown[i].material.vertexColors, true)
      assert.ok(shown[i].material.color.equals(original[i].material.color))
      assert.equal(result.parser.associations.get(shown[i].material).materials, i)
    } else assert.equal(shown[i].material, original[i].material)
  }
  a.release(); a.release(); await clock.advance(); assert.equal(loader.diagnostics().disposed.materials, 0)
  b.release(); await clock.advance(); assert.equal(loader.diagnostics().disposed.materials, 4); assert.equal(loader.diagnostics().disposed.geometries, 0)
  await clock.advance(24); assert.equal(loader.diagnostics().baseLoads, 1); assert.equal(loader.diagnostics().bases.length, 1)
  await clock.advance(1); assert.equal(loader.diagnostics().bases.length, 0); assert.equal(loader.diagnostics().skins.length, 0)
  assert.equal(loader.diagnostics().disposed.geometries, 5); assert.equal(loader.diagnostics().disposed.textures, 2)
  assert.equal(loads.original.length, 0)
  assert.throws(() => { loader.diagnostics().disposed.textures = 99 }, TypeError)
})

test('partner and team changes reuse the common geometry with a two-skin LRU and a warm return', async () => {
  const { loader, clock, loads } = setup()
  const a = loader.acquire('/models/a.glb'), first = await a.ready; a.release(); await clock.advance()
  const b = loader.acquire('/models/b.glb'), partner = await b.ready; b.release(); await clock.advance()
  assert.equal(meshes(first)[0].geometry, meshes(partner)[0].geometry)
  const aAgain = loader.acquire('/models/a.glb'); await aAgain.ready; aAgain.release(); await clock.advance()
  assert.deepEqual(loads.skin, ['a', 'b']); assert.equal(loader.diagnostics().skinCacheHits, 1)
  const c = loader.acquire('/models/c.glb'), other = await c.ready
  assert.equal(meshes(other)[4].geometry, meshes(first)[4].geometry); assert.equal(loads.base.length, 1)
  assert.equal(loader.diagnostics().skins.length, 2); assert.deepEqual(loader.diagnostics().skins.map(entry => entry.driverId).sort(), ['a', 'c'])
  assert.equal(loader.diagnostics().disposed.geometries, 0); assert.equal(loader.diagnostics().disposed.textures, 1)
  c.release(); await clock.advance(25)
})

test('Alpine replaces only one primitive UV buffer, shares that variant across both pilots, and keeps base unchanged', async () => {
  const { loader, clock, base, loads } = setup()
  const a = loader.acquire('/models/alpine-a.glb'), alpineA = await a.ready
  const original = meshes(base), first = meshes(alpineA)
  assert.notEqual(first[0].geometry, original[0].geometry)
  assert.deepEqual([...first[0].geometry.getAttribute('uv1').array], [...new Float32Array([.2, .3, .8, .1, .4, .9])])
  assert.deepEqual([...original[0].geometry.getAttribute('uv1').array], [0, 0, 1, 0, 0, 1])
  for (const name of ['position', 'uv']) assert.deepEqual(first[0].geometry.getAttribute(name).array, original[0].geometry.getAttribute(name).array)
  for (let i = 1; i < first.length; i++) assert.equal(first[i].geometry, original[i].geometry)
  const b = loader.acquire('/models/alpine-b.glb'), alpineB = await b.ready
  assert.equal(meshes(alpineB)[0].geometry, first[0].geometry); assert.equal(loads.patch, 1)
  a.release(); await clock.advance(25); assert.equal(loader.diagnostics().disposed.geometries, 0)
  b.release(); await clock.advance(); await clock.advance(25)
  assert.equal(loader.diagnostics().disposed.geometries, 6); assert.equal(loader.diagnostics().evictions.variants, 1)
})

test('failed base falls back to the correct original and the next visit retries the base', async () => {
  const base = makeBase(); let attempts = 0
  const { loader, clock, loads } = setup({ loadBase: async () => { if (++attempts === 1) throw new Error('Base unavailable'); return base } })
  const first = loader.acquire('/models/a.glb'); assert.equal((await first.ready).original, '/models/a.glb')
  assert.equal(loader.diagnostics().fallbacks, 1); first.release(); await clock.advance(); assert.equal(loads.originalReleases, 1)
  const retry = loader.acquire('/models/a.glb'); assert.equal((await retry.ready).userData.modelDelivery.driverId, 'a'); assert.equal(attempts, 2)
  retry.release(); await clock.advance(); await clock.advance(25)
})

test('skin decode failure falls back without poisoning the cached entry or destroying an active shared base', async () => {
  let attempts = 0
  const { loader, clock, loads } = setup({ loadSkin: async (_base, driver) => { if (driver.driverId === 'b' && ++attempts === 1) throw new Error('Skin texture decode failed'); return makeSkin(driver) } })
  const anchor = loader.acquire('/models/a.glb'); await anchor.ready
  const failed = loader.acquire('/models/b.glb'); assert.equal((await failed.ready).original, '/models/b.glb'); failed.release(); await clock.advance()
  assert.equal(loader.diagnostics().disposed.geometries, 0); assert.deepEqual(loads.original, ['/models/b.glb'])
  const retry = loader.acquire('/models/b.glb'); assert.equal((await retry.ready).userData.modelDelivery.driverId, 'b'); assert.equal(attempts, 2); assert.equal(loads.base.length, 1)
  retry.release(); anchor.release(); await clock.advance(); await clock.advance(25)
})

test('bad UV patch retries after correction while another team keeps the common base alive', async () => {
  let attempts = 0
  const { loader, clock, loads } = setup({ loadUVPatch: async () => (++attempts === 1 ? new Float32Array([.1, .2, .8, .1, .4, .9]) : new Float32Array([.2, .3, .8, .1, .4, .9])).buffer })
  const anchor = loader.acquire('/models/a.glb'); await anchor.ready
  const failed = loader.acquire('/models/alpine-a.glb'); assert.equal((await failed.ready).original, '/models/alpine-a.glb'); failed.release(); await clock.advance()
  const retry = loader.acquire('/models/alpine-a.glb'); assert.equal((await retry.ready).userData.modelDelivery.driverId, 'alpine-a'); assert.equal(attempts, 2); assert.equal(loads.base.length, 1)
  assert.equal(loader.diagnostics().fallbackReasons['uv-patch'], 1)
  retry.release(); anchor.release(); await clock.advance(); await clock.advance(25)
})

test('releasing before a failed base settles never downloads an abandoned original', async () => {
  const pending = deferred(), { loader, clock, loads } = setup({ loadBase: () => pending.promise })
  const lease = loader.acquire('/models/a.glb'), rejected = assert.rejects(lease.ready, { name: 'AbortError' })
  lease.release(); await clock.advance(); pending.reject(new Error('Base unavailable')); await rejected
  assert.equal(loads.original.length, 0); assert.equal(loader.diagnostics().fallbacks, 0)
  await clock.advance(25); assert.equal(loader.diagnostics().bases.length, 0)
})

test('late completion of a fully abandoned base is disposed exactly once', async () => {
  const pending = deferred(), base = makeBase(), { loader, clock, loads } = setup({ loadBase: () => pending.promise })
  const lease = loader.acquire('/models/a.glb'), rejected = assert.rejects(lease.ready, { name: 'AbortError' })
  lease.release(); await clock.advance(); await clock.advance(25); pending.resolve(base); await rejected; await settle()
  assert.equal(loader.diagnostics().disposed.geometries, 5); assert.equal(loader.diagnostics().evictions.bases, 1)
  assert.equal(loads.skin.length, 0); assert.equal(loads.original.length, 0)
})

test('rapid released selections skip queued decodes, dispose a late atlas, and preserve the still active car', async () => {
  const pending = deferred(); let running = 0, maximum = 0, calls = 0
  const { loader, clock, loads } = setup({ loadSkin: async (_base, driver) => {
    calls++; running++; maximum = Math.max(maximum, running)
    if (driver.driverId === 'b') { const value = await pending.promise; running--; return value }
    const value = makeSkin(driver); running--; return value
  } })
  const anchor = loader.acquire('/models/a.glb'); await anchor.ready
  const changing = ['b', 'c', 'd', 'e', 'f'].map(id => loader.acquire(`/models/${id}.glb`))
  const rejected = changing.map(lease => assert.rejects(lease.ready, { name: 'AbortError' }))
  await settle(); for (const lease of changing) lease.release(); await clock.advance()
  const late = makeSkin({ driverId: 'b' }); let atlasDisposed = 0; [...late.resources.textures][0].addEventListener('dispose', () => atlasDisposed++)
  pending.resolve(late); await Promise.all(rejected); await settle()
  assert.equal(calls, 2); assert.equal(maximum, 1); assert.equal(atlasDisposed, 1)
  assert.equal(loader.diagnostics().disposed.geometries, 0); assert.equal(loader.diagnostics().bases[0].refs, 1)
  assert.equal(loader.diagnostics().skins.length, 1); assert.equal(loader.diagnostics().queuedSkins, 0); assert.equal(loader.diagnostics().skinLoadsInFlight, 0)
  assert.equal(loads.original.length, 0)
  anchor.release(); await clock.advance(); await clock.advance(25)
})

test('an original fallback lease is released even if the outer selection leaves before it finishes', async () => {
  const original = deferred(); let releases = 0
  const { loader, clock } = setup({ loadBase: async () => { throw new Error('Base unavailable') }, acquireOriginal: () => ({ ready: original.promise, release() { releases++ } }) })
  const lease = loader.acquire('/models/a.glb'), rejected = assert.rejects(lease.ready, { name: 'AbortError' })
  await settle(); assert.equal(loader.diagnostics().fallbacks, 1)
  lease.release(); await clock.advance(); assert.equal(releases, 1)
  original.resolve({ scene: new Scene() }); await rejected; lease.release(); assert.equal(releases, 1)
  await clock.advance(25)
})

test('unknown paths use only the original loader', async () => {
  const { loader, loads } = setup(), lease = loader.acquire('/models/unknown.glb')
  assert.equal((await lease.ready).original, '/models/unknown.glb'); lease.release()
  assert.equal(loads.base.length, 0); assert.equal(loads.skin.length, 0); assert.equal(loads.originalReleases, 1)
})


function atlasBlobFixture(overrides = {}) {
  const calls = [], originalURI = 'atlas-test.png', abort = new AbortController()
  const skin = { images: Array.from({ length: 11 }, (_, index) => ({ mimeType: 'image/png', uri: index === 6 ? originalURI : 'shared-cache-only.png', name: `Image ${index}` })),
    textures: Array.from({ length: 14 }, (_, index) => ({ source: index < 6 ? index : index < 10 ? 6 : index - 3, sampler: index })), samplers: [{ minFilter: 9987 }], materials: [{ name: 'Preserved authored material' }] }
  const options = { skin, driver: { skinPath: '/models-optimized/skin-test.gltf', atlasPath: '/models-optimized/atlas-test.png' },
    manifest: { base: { textureRemap: [0, 1, 2, 3, 4, 5, null, null, null, null, 6, 7, 8, 9] } }, signal: abort.signal,
    fetchAsset: async (url, init) => { calls.push({ operation: 'fetch', url, signal: init.signal }); return { ok: true, blob: async () => new Blob(['exact authored PNG bytes'], { type: 'image/png' }) } },
    objectURLs: { createObjectURL(blob) { calls.push({ operation: 'create', blob }); return 'blob:qa-atlas' }, revokeObjectURL(url) { calls.push({ operation: 'revoke', url }) } }, ...overrides }
  return { options, calls, abort, originalURI }
}

test('atlas fetch bypasses image destinations, preserves every descriptor field except image6 URI, and revokes after decoding', async () => {
  const { options, calls, originalURI } = atlasBlobFixture(), original = structuredClone(options.skin)
  const result = await withDriverAtlasBlob(options, async resolved => {
    calls.push({ operation: 'decode' }); assert.equal(resolved.images[6].uri, 'blob:qa-atlas')
    assert.equal(resolved.images[6].mimeType, 'image/png'); assert.equal(resolved.images[6].name, 'Image 6')
    for (let index = 0; index < 11; index++) if (index !== 6) assert.equal(resolved.images[index], options.skin.images[index])
    assert.equal(resolved.materials, options.skin.materials); assert.equal(resolved.textures, options.skin.textures); assert.equal(resolved.samplers, options.skin.samplers)
    assert.ok(!calls.some(call => call.operation === 'revoke')); return 'decoded and bounded'
  })
  assert.equal(result, 'decoded and bounded'); assert.equal(options.skin.images[6].uri, originalURI); assert.deepEqual(options.skin, original)
  assert.deepEqual(calls.map(call => call.operation), ['fetch', 'create', 'decode', 'revoke'])
  assert.equal(calls[0].url, options.driver.atlasPath); assert.equal(calls[0].signal, options.signal)
  assert.equal(await calls[1].blob.text(), 'exact authored PNG bytes'); assert.equal(calls[3].url, 'blob:qa-atlas')
})

test('atlas object URL is revoked when decoding throws or its consumer leaves during decoding', async () => {
  const first = atlasBlobFixture()
  await assert.rejects(withDriverAtlasBlob(first.options, async () => { throw new Error('PNG decode failed') }), /PNG decode failed/)
  assert.equal(first.calls.filter(call => call.operation === 'revoke').length, 1)
  const second = atlasBlobFixture()
  await assert.rejects(withDriverAtlasBlob(second.options, async () => { second.abort.abort(); return 'late decode' }), { name: 'AbortError' })
  assert.equal(second.calls.filter(call => call.operation === 'revoke').length, 1)
})

test('atlas cancellation before or during fetch does not create a blob URL', async () => {
  const first = atlasBlobFixture(); first.abort.abort()
  await assert.rejects(withDriverAtlasBlob(first.options, async () => null), { name: 'AbortError' }); assert.deepEqual(first.calls, [])
  const second = atlasBlobFixture(); second.options.fetchAsset = async () => { second.abort.abort(); return { ok: true, blob: async () => new Blob(['late HTTP body']) } }
  await assert.rejects(withDriverAtlasBlob(second.options, async () => null), { name: 'AbortError' }); assert.deepEqual(second.calls, [])
})

test('atlas HTTP errors and unexpected texture/image paths fail before decoding without leaking a URL', async () => {
  const failed = atlasBlobFixture({ fetchAsset: async () => ({ ok: false, status: 503 }) })
  await assert.rejects(withDriverAtlasBlob(failed.options, async () => null), /atlas returned HTTP 503/); assert.deepEqual(failed.calls, [])
  const wrongURI = atlasBlobFixture(); wrongURI.options.skin.images[6].uri = 'other-driver.png'
  await assert.rejects(withDriverAtlasBlob(wrongURI.options, async () => null), /descriptor path mismatch/); assert.deepEqual(wrongURI.calls, [])
  const wrongSource = atlasBlobFixture(); wrongSource.options.skin.textures[7].source = 5
  await assert.rejects(withDriverAtlasBlob(wrongSource.options, async () => null), /descriptor source mismatch/); assert.deepEqual(wrongSource.calls, [])
  const extraSource = atlasBlobFixture(); extraSource.options.skin.textures[0].source = 6
  await assert.rejects(withDriverAtlasBlob(extraSource.options, async () => null), /descriptor source mismatch/); assert.deepEqual(extraSource.calls, [])
})
