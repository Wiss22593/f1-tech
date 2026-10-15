import { BufferAttribute } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { configureAuthoredLiveryLoader } from './authored-livery.mjs'

class AbandonedCarLoad extends Error {
  constructor() { super('Car selection was released'); this.name = 'AbortError' }
}
const checkSignal = signal => { if (signal?.aborted) throw new AbandonedCarLoad() }
const textureValues = material => Object.values(material).filter(value => value?.isTexture)

function collectSceneResources(scene) {
  const geometries = new Set(), materials = new Set(), textures = new Set()
  scene.traverse(node => {
    if (!node.isMesh) return
    geometries.add(node.geometry)
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
      materials.add(material)
      for (const texture of textureValues(material)) textures.add(texture)
    }
  })
  return { geometries, materials, textures }
}
function disposeResources(resources, counts) {
  for (const kind of ['geometries', 'materials', 'textures']) {
    for (const resource of resources[kind] ?? []) { resource.dispose(); if (counts) counts[kind]++ }
  }
}
function cloneSceneWithAssociations(source, associations) {
  const scene = source.clone(true), copied = new Map(associations)
  function pair(original, clone) {
    if (original.name !== clone.name || original.children.length !== clone.children.length) throw new Error('Shared car hierarchy mismatch')
    const association = associations.get(original)
    if (association) copied.set(clone, association)
    for (let i = 0; i < original.children.length; i++) pair(original.children[i], clone.children[i])
  }
  pair(source, scene)
  return { scene, associations: copied }
}
async function assetBuffer(path, signal) {
  checkSignal(signal)
  const response = await fetch(path, { signal })
  if (!response.ok) throw new Error(`Car resource returned HTTP ${response.status}: ${path}`)
  const buffer = await response.arrayBuffer()
  checkSignal(signal)
  return buffer
}
async function defaultLoadBase(path, signal) {
  const loader = new GLTFLoader()
  configureAuthoredLiveryLoader(loader)
  const buffer = await assetBuffer(path, signal)
  const result = await loader.parseAsync(buffer, path.slice(0, path.lastIndexOf('/') + 1))
  // If an embedded decode completed after its last consumer left, return it to
  // the pool: the pool disposes it exactly once and never starts a skin for it.
  return result
}

const requiredTextureSlots = [
  ['map', definition => definition.pbrMetallicRoughness?.baseColorTexture],
  ['metalnessMap', definition => definition.pbrMetallicRoughness?.metallicRoughnessTexture],
  ['roughnessMap', definition => definition.pbrMetallicRoughness?.metallicRoughnessTexture],
  ['normalMap', definition => definition.normalTexture],
  ['aoMap', definition => definition.occlusionTexture],
  ['emissiveMap', definition => definition.emissiveTexture],
]
function validateSkinMaterials(materials, definitions, atlasIndices) {
  if (!definitions || materials.length !== definitions.length) throw new Error('Incomplete car skin materials')
  for (let index = 0; index < definitions.length; index++) {
    const definition = definitions[index], material = materials[index]
    if (!material || material.name !== (definition.name ?? '')) throw new Error(`Car skin material mismatch: ${index}`)
    for (const [slot, reference] of requiredTextureSlots) {
      const expected = reference(definition)
      if (!expected) continue
      const texture = material[slot]
      if (!texture?.isTexture) throw new Error(`Car skin texture missing: material ${index} ${slot}`)
      if (texture.channel !== (expected.texCoord ?? 0) || texture.flipY !== false) throw new Error(`Car skin UV orientation mismatch: material ${index} ${slot}`)
      if ((slot === 'map' || slot === 'emissiveMap') && texture.colorSpace !== 'srgb') throw new Error(`Car skin color space mismatch: material ${index} ${slot}`)
    }
  }
  for (const index of atlasIndices) if (!materials[index]?.map) throw new Error(`Car atlas missing: ${index}`)
}

/** Scope a fetched PNG blob to decoding, bypassing image-destination SW caches. */
export async function withDriverAtlasBlob({ skin, driver, manifest, signal, fetchAsset = globalThis.fetch, objectURLs = URL }, decode) {
  const atlasTextureIndices = manifest.base.textureRemap.flatMap((index, original) => index === null ? [original] : [])
  const image = skin.images?.[6]
  const referencedAtlasIndices = (skin.textures ?? []).flatMap((texture, index) => texture.source === 6 ? [index] : [])
  if (atlasTextureIndices.length !== 4 || referencedAtlasIndices.length !== atlasTextureIndices.length || atlasTextureIndices.some(index => skin.textures?.[index]?.source !== 6) || image?.mimeType !== 'image/png' || !image.uri || image.bufferView !== undefined) throw new Error('Car atlas descriptor source mismatch')
  const baseURL = new URL(driver.skinPath, 'https://f1-tech.invalid')
  if (new URL(image.uri, baseURL).href !== new URL(driver.atlasPath, baseURL).href) throw new Error('Car atlas descriptor path mismatch')
  checkSignal(signal)
  // An explicit fetch has an empty Request.destination, so the existing image
  // service-worker rule cannot retain every visited atlas in CacheStorage or
  // hide an extra background refresh. The HTTP cache can still reuse hashes.
  const response = await fetchAsset(driver.atlasPath, { signal })
  if (!response.ok) throw new Error(`Car atlas returned HTTP ${response.status}: ${driver.atlasPath}`)
  const blob = await response.blob()
  checkSignal(signal)
  let objectURL
  try {
    objectURL = objectURLs.createObjectURL(blob)
    const resolved = { ...skin, images: skin.images.map((source, index) => index === 6 ? { ...source, uri: objectURL } : source) }
    const result = await decode(resolved)
    checkSignal(signal)
    return result
  } finally {
    // afterRoot loads all material/texture dependencies before decode resolves.
    // Every canvas-backed texture is ready before this URL is revoked.
    if (objectURL) objectURLs.revokeObjectURL(objectURL)
  }
}
/** Load only the per-driver atlas; every constant texture resolves from the base parser. */
async function defaultLoadSkin(base, driver, manifest, signal) {
  checkSignal(signal)
  const sharedTextures = new Set(await base.parser.getDependencies('texture'))
  for (const texture of collectSceneResources(base.scene).textures) sharedTextures.add(texture)
  const loader = new GLTFLoader()
  let skinParser, materials = [], resources
  // Register before the authored decoder. GLTFLoader's default plugins do not
  // intercept these uncompressed PNG textures.
  loader.register(parser => ({
    name: 'F1TechSharedCarTextures',
    loadTexture(index) {
      const mapped = manifest.base.textureRemap[index]
      if (mapped === null) return null
      if (!Number.isInteger(mapped)) throw new Error(`Unknown shared texture: ${index}`)
      return base.parser.getDependency('texture', mapped)
    },
    async afterRoot(result) {
      skinParser = result.parser
      const outcomes = await Promise.allSettled((parser.json.materials ?? []).map((_, index) => parser.getDependency('material', index)))
      materials = outcomes.map(outcome => outcome.status === 'fulfilled' ? outcome.value : null)
      const ownedTextures = new Set()
      for (const material of materials) if (material) for (const texture of textureValues(material)) if (!sharedTextures.has(texture)) ownedTextures.add(texture)
      // Include the raw atlas dependencies as well as any texCoord/transform
      // copies created by assignTexture. No shared texture is owned by a skin.
      const textures = await Promise.allSettled((parser.json.textures ?? []).map((_, index) => parser.getDependency('texture', index)))
      for (const outcome of textures) if (outcome.status === 'fulfilled' && outcome.value && !sharedTextures.has(outcome.value)) ownedTextures.add(outcome.value)
      resources = { materials: new Set(materials.filter(Boolean)), textures: ownedTextures }
      const failure = outcomes.find(outcome => outcome.status === 'rejected')
      if (failure) throw failure.reason
      validateSkinMaterials(materials, parser.json.materials, manifest.base.atlasMaterialIndices)
      checkSignal(signal)
    },
  }))
  configureAuthoredLiveryLoader(loader)
  try {
    const response = await fetch(driver.skinPath, { signal })
    if (!response.ok) throw new Error(`Car skin returned HTTP ${response.status}: ${driver.skinPath}`)
    const skin = JSON.parse(await response.text())
    checkSignal(signal)
    await withDriverAtlasBlob({ skin, driver, manifest, signal }, resolved => loader.parseAsync(JSON.stringify(resolved), driver.skinPath.slice(0, driver.skinPath.lastIndexOf('/') + 1)))
    return { materials, definitions: skinParser.json.materials, resources }
  } catch (error) {
    if (resources) disposeResources(resources)
    throw error
  }
}

function applyUVPatch(base, patch, buffer) {
  if (patch.attribute !== 'uv1' || patch.componentType !== 5126 || !Number.isInteger(patch.count) || buffer.byteLength !== patch.count * 2 * 4) throw new Error('Invalid Alpine UV patch')
  const cloned = cloneSceneWithAssociations(base.scene, base.parser.associations)
  const matches = []
  cloned.scene.traverse(mesh => {
    if (!mesh.isMesh) return
    const reference = cloned.associations.get(mesh)
    if (reference?.meshes === patch.meshIndex && reference?.primitives === patch.primitiveIndex) matches.push(mesh)
  })
  if (matches.length !== 1) throw new Error('Alpine UV patch mesh does not resolve uniquely')
  const mesh = matches[0]
  if (mesh.geometry.getAttribute('uv1')?.count !== patch.count || mesh.geometry.getAttribute('position')?.count !== patch.count) throw new Error('Alpine UV patch vertex count mismatch')
  const uv = new Float32Array(buffer)
  if (uv.some(value => !Number.isFinite(value))) throw new Error('Alpine UV patch is non-finite')
  // Only this primitive gets private buffers. Other 489 meshes retain their
  // original BufferGeometry references, so disposing this variant is safe.
  const geometry = mesh.geometry.clone()
  geometry.setAttribute('uv1', new BufferAttribute(uv, 2))
  mesh.geometry = geometry
  return { ...cloned, geometries: new Set([geometry]) }
}

/** Injectable resource pool used by the normal loader and regression tests. */
export function createOptimizedCarLoader({
  manifest,
  acquireOriginal,
  loadBase = defaultLoadBase,
  loadSkin = defaultLoadSkin,
  loadUVPatch = assetBuffer,
  setTimer = setTimeout,
  clearTimer = clearTimeout,
  now = Date.now,
  idleMs = 1500,
  maxSkins = 2,
} = {}) {
  if (manifest?.version !== 1 || !manifest.base || !manifest.drivers || !acquireOriginal) throw new Error('Optimized car loader configuration unavailable')
  const bases = new Map(), skins = new Map(), cars = new Map(), queue = []
  let skinRunning = 0, skinOrder = 0
  const counters = {
    baseLoads: 0, skinLoads: 0, skinCacheHits: 0, carCacheHits: 0,
    cancelledLoads: 0, fallbacks: 0, fallbackReasons: {}, uvPatchLoads: 0,
    evictions: { bases: 0, skins: 0, cars: 0, variants: 0 },
    disposed: { geometries: 0, materials: 0, textures: 0 },
  }
  function evictSkin(entry) {
    if (entry.refs || entry.evicted) return
    entry.evicted = true
    if (skins.get(entry.key) === entry) skins.delete(entry.key)
    entry.abort.abort()
    if (entry.result) disposeResources(entry.result.resources, counters.disposed)
    entry.result = null
    counters.evictions.skins++
  }
  function trimSkins() {
    const candidates = [...skins.values()].filter(entry => !entry.refs).sort((a, b) => a.order - b.order)
    while (skins.size > maxSkins && candidates.length) evictSkin(candidates.shift())
  }
  function drainSkinQueue() {
    if (skinRunning) return
    while (queue.length) {
      const entry = queue.shift()
      if (entry.evicted || !entry.refs) { entry.reject(new AbandonedCarLoad()); continue }
      skinRunning++
      counters.skinLoads++
      Promise.resolve().then(() => loadSkin(entry.base.result, entry.driver, manifest, entry.abort.signal)).then(result => {
        if (entry.evicted || !entry.refs) {
          disposeResources(result.resources, counters.disposed)
          entry.reject(new AbandonedCarLoad())
        } else {
          entry.result = result
          entry.resolve(result)
        }
      }, error => {
        // A rejected entry must never poison a later visit to the same driver.
        if (skins.get(entry.key) === entry) skins.delete(entry.key)
        entry.reject(error)
      }).finally(() => { entry.settled = true; skinRunning--; trimSkins(); drainSkinQueue() })
      return
    }
  }
  function acquireSkin(base, driver) {
    const key = `${driver.basePath}\0${driver.skinPath}`
    let entry = skins.get(key)
    if (entry) counters.skinCacheHits++
    else {
      entry = { key, driver, base, refs: 0, result: null, settled: false, evicted: false, lastUsed: now(), order: ++skinOrder, abort: new AbortController() }
      entry.ready = new Promise((resolve, reject) => { entry.resolve = resolve; entry.reject = reject })
      skins.set(key, entry)
      queue.push(entry)
    }
    entry.refs++; entry.lastUsed = now(); entry.order = ++skinOrder
    trimSkins(); drainSkinQueue()
    return entry
  }
  function releaseSkin(entry) {
    entry.refs--; entry.lastUsed = now(); entry.order = ++skinOrder
    // Stop queued/HTTP work for a selection that no longer has a consumer.
    // An in-progress image decode is disposed before the next atlas starts.
    if (!entry.refs && !entry.settled) evictSkin(entry)
    trimSkins(); drainSkinQueue()
  }
  function evictBase(entry) {
    if (entry.refs || entry.evicted) return
    entry.evicted = true
    if (bases.get(entry.key) === entry) bases.delete(entry.key)
    entry.abort.abort()
    for (const skin of [...skins.values()]) if (skin.base === entry) evictSkin(skin)
    for (const variant of entry.variants.values()) if (variant.result) {
      disposeResources({ geometries: variant.result.geometries }, counters.disposed)
      counters.evictions.variants++
      variant.result = null
    }
    entry.variants.clear()
    if (entry.result) disposeResources(collectSceneResources(entry.result.scene), counters.disposed)
    entry.result = null
    counters.evictions.bases++
  }
  function acquireBase(path) {
    let entry = bases.get(path)
    if (!entry) {
      entry = { key: path, refs: 0, timer: null, result: null, evicted: false, variants: new Map(), abort: new AbortController() }
      bases.set(path, entry)
      counters.baseLoads++
      entry.ready = Promise.resolve().then(() => loadBase(path, entry.abort.signal)).then(result => {
        if (entry.evicted) { disposeResources(collectSceneResources(result.scene), counters.disposed); throw new AbandonedCarLoad() }
        entry.result = result
        return result
      }, error => { if (bases.get(path) === entry) bases.delete(path); throw error })
    }
    clearTimer(entry.timer); entry.timer = null; entry.refs++
    return entry
  }
  function releaseBase(entry) {
    entry.refs--
    if (!entry.refs && !entry.evicted && entry.timer === null) entry.timer = setTimer(() => { entry.timer = null; evictBase(entry) }, idleMs)
  }
  async function variantFor(base, driver) {
    if (!driver.uvPatch) return { scene: base.result.scene, associations: base.result.parser.associations }
    const key = driver.uvPatch.path
    let entry = base.variants.get(key)
    if (!entry) {
      entry = { result: null }
      base.variants.set(key, entry)
      counters.uvPatchLoads++
      entry.ready = Promise.resolve().then(() => loadUVPatch(key, base.abort.signal)).then(async buffer => {
        if (base.evicted) throw new AbandonedCarLoad()
        if (!globalThis.crypto?.subtle || !/^[a-f0-9]{64}$/i.test(driver.uvPatch.sha256 ?? '')) throw new Error('Alpine UV patch checksum verification unavailable')
        const digest = [...new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', buffer))].map(value => value.toString(16).padStart(2, '0')).join('')
        if (digest !== driver.uvPatch.sha256) throw new Error('Alpine UV patch checksum mismatch')
        if (base.evicted) throw new AbandonedCarLoad()
        const result = applyUVPatch(base.result, driver.uvPatch, buffer)
        entry.result = result
        return result
      }).catch(error => { if (base.variants.get(key) === entry) base.variants.delete(key); throw error })
    }
    return entry.ready
  }
  function buildDriver(base, variant, skin, driver) {
    const cloned = cloneSceneWithAssociations(variant.scene, variant.associations), owned = new Set(), replaced = new Map()
    const atlasIndices = new Set(manifest.base.atlasMaterialIndices)
    try {
      cloned.scene.traverse(mesh => {
        if (!mesh.isMesh) return
        const replace = source => {
          const index = variant.associations.get(source)?.materials
          if (!Number.isInteger(index)) throw new Error(`Car material association missing: ${source.name}`)
          if (!atlasIndices.has(index)) return source
          if (!skin.materials[index]?.map) throw new Error(`Car atlas missing: ${index}`)
          let material = replaced.get(source)
          if (!material) {
            // Keep GLTFLoader's per-geometry final material variant (normalScale,
            // flat shading, vertex colors, etc.), replacing only the atlas map.
            material = source.clone()
            material.map = skin.materials[index].map
            material.needsUpdate = true
            replaced.set(source, material); owned.add(material)
            cloned.associations.set(material, { materials: index })
          }
          return material
        }
        mesh.material = Array.isArray(mesh.material) ? mesh.material.map(replace) : replace(mesh.material)
      })
      if (replaced.size < atlasIndices.size) throw new Error('Car atlas material coverage incomplete')
      const parser = Object.create(base.result.parser)
      parser.associations = cloned.associations
      return { result: { ...base.result, scene: cloned.scene, scenes: [cloned.scene], parser, userData: { ...base.result.userData, modelDelivery: { mode: 'optimized', teamId: driver.teamId, driverId: driver.driverId, basePath: driver.basePath } } }, owned }
    } catch (error) { disposeResources({ materials: owned }, counters.disposed); throw error }
  }
  function retireCar(entry) {
    if (entry.refs || entry.retired) return
    entry.retired = true
    if (cars.get(entry.path) === entry) cars.delete(entry.path)
    if (entry.owned) disposeResources({ materials: entry.owned }, counters.disposed)
    entry.owned = null; entry.result = null
    if (entry.skin) { releaseSkin(entry.skin); entry.skin = null }
    if (entry.base) { releaseBase(entry.base); entry.base = null }
    if (entry.fallback) { entry.fallback.release(); entry.fallback = null }
    counters.evictions.cars++
  }
  function checkEntry(entry) { if (entry.retired || !entry.refs) throw new AbandonedCarLoad() }
  function fallbackReason(error) {
    const message = String(error?.message ?? error)
    if (/UV|Alpine/.test(message)) return 'uv-patch'
    if (/skin|atlas|texture|material/i.test(message)) return 'skin'
    return 'base-or-resource'
  }
  function acquire(path) {
    const driver = manifest.drivers[path]
    if (!driver) return acquireOriginal(path)
    let entry = cars.get(path)
    if (entry) counters.carCacheHits++
    else {
      entry = { path, refs: 0, timer: null, retired: false, base: acquireBase(driver.basePath), skin: null, fallback: null, owned: null, result: null }
      cars.set(path, entry)
      const base = entry.base
      entry.ready = Promise.resolve().then(async () => {
        await base.ready; checkEntry(entry)
        const variant = await variantFor(base, driver); checkEntry(entry)
        entry.skin = acquireSkin(base, driver)
        const skin = await entry.skin.ready; checkEntry(entry)
        const built = buildDriver(base, variant, skin, driver)
        entry.owned = built.owned; entry.result = built.result
        return built.result
      }).catch(async error => {
        if (entry.retired || !entry.refs) { if (cars.get(path) === entry) cars.delete(path); counters.cancelledLoads++; throw new AbandonedCarLoad() }
        // Retain the original lease through the same outer consumer lifetime.
        // Nothing is shown until either a complete skin or the original resolves.
        if (entry.skin) { const failedSkin = entry.skin; releaseSkin(failedSkin); evictSkin(failedSkin); entry.skin = null }
        if (entry.base) { releaseBase(entry.base); entry.base = null }
        if (cars.get(path) === entry) cars.delete(path)
        counters.fallbacks++
        const reason = fallbackReason(error)
        counters.fallbackReasons[reason] = (counters.fallbackReasons[reason] ?? 0) + 1
        entry.fallback = acquireOriginal(path)
        const original = await entry.fallback.ready
        checkEntry(entry)
        entry.result = original
        return original
      })
    }
    clearTimer(entry.timer); entry.timer = null; entry.refs++
    let released = false
    return { ready: entry.ready, release() {
      if (released) return
      released = true; entry.refs--
      if (!entry.refs && entry.timer === null) entry.timer = setTimer(() => { entry.timer = null; retireCar(entry) }, 0)
    } }
  }
  function diagnostics() {
    const snapshot = {
      ...counters, fallbackReasons: { ...counters.fallbackReasons },
      evictions: { ...counters.evictions }, disposed: { ...counters.disposed },
      activeCars: cars.size,
      bases: [...bases.values()].map(entry => ({ path: entry.key, refs: entry.refs, loaded: Boolean(entry.result), variants: entry.variants.size, geometries: entry.result ? collectSceneResources(entry.result.scene).geometries.size : 0 })),
      skins: [...skins.values()].map(entry => ({ path: entry.driver.skinPath, driverId: entry.driver.driverId, refs: entry.refs, loaded: Boolean(entry.result) })),
      queuedSkins: queue.filter(entry => !entry.evicted).length, skinLoadsInFlight: skinRunning,
      maxCachedSkins: maxSkins, baseIdleMs: idleMs,
    }
    for (const list of [snapshot.bases, snapshot.skins]) { for (const item of list) Object.freeze(item); Object.freeze(list) }
    for (const value of [snapshot.fallbackReasons, snapshot.evictions, snapshot.disposed]) Object.freeze(value)
    return Object.freeze(snapshot)
  }
  return { acquire, diagnostics }
}



