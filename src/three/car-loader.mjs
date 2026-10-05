import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { configureAuthoredLiveryLoader } from './authored-livery.mjs'
const loader = new GLTFLoader()
configureAuthoredLiveryLoader(loader)
const entries = new Map()
export function disposeCarScene(scene) {
  const geometries = new Set(), materials = new Set(), textures = new Set()
  scene.traverse(node => {
    if (!node.isMesh) return
    geometries.add(node.geometry)
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
      materials.add(material)
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value)
    }
  })
  for (const geometry of geometries) geometry.dispose()
  for (const material of materials) material.dispose()
  for (const texture of textures) texture.dispose()
}
/** Only referenced cars remain cached. Late results from abandoned loads are disposed too. */
export function acquireCar(path, load = value => loader.loadAsync(value)) {
  let entry = entries.get(path)
  if (!entry) {
    entry = { refs: 0, timer: null, result: null, settled: false }
    entries.set(path, entry)
    entry.ready = Promise.resolve().then(() => load(path)).then(result => { entry.result = result; entry.settled = true; schedule(); return result }, error => { entry.settled = true; schedule(); throw error })
  }
  function schedule() {
    if (entry.refs || !entry.settled || entry.timer) return
    // React StrictMode's immediate remount can reclaim the same source.
    entry.timer = setTimeout(() => {
      entry.timer = null
      if (entry.refs) return
      if (entries.get(path) === entry) entries.delete(path)
      if (entry.result) disposeCarScene(entry.result.scene)
      entry.result = null
    }, 0)
  }
  clearTimeout(entry.timer); entry.timer = null; entry.refs++
  let released = false
  return { ready: entry.ready, release() { if (released) return; released = true; entry.refs--; schedule() } }
}
