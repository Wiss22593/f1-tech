import { DoubleSide, MeshBasicMaterial } from 'three'

export const universalMapsPath = '/models/F1tech_maps.glb'
export const universalMapsManifestPath = '/models/F1tech_maps_manifest.json'
let manifestRequest
export function loadUniversalMapsManifest() {
  return manifestRequest ??= fetch(universalMapsManifestPath).then(response => {
    if (!response.ok) throw new Error('Universal maps manifest: ' + response.status)
    return response.json()
  }).then(manifest => {
    if (manifest.format !== 'F1TECH_UNIVERSAL_MAPS' || !manifest.maps || !manifest.fia_aliases) throw new Error('Invalid universal maps manifest')
    return manifest
  }).catch(error => { manifestRequest = null; throw error })
}
const aliasCache = new WeakMap()
function manifestAliases(manifest) {
  if (!aliasCache.has(manifest)) aliasCache.set(manifest, new Map(Object.entries(manifest.fia_aliases).map(([name, map]) => [canonical(name), map])))
  return aliasCache.get(manifest)
}
const canonical = value => String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
const componentMaps = { nose: 'MAP_NOSE', floor: 'MAP_FLOOR', diffuser: 'MAP_DIFFUSER', sidepods: 'MAP_SIDEPODS', engineCover: 'MAP_ENGINE_COVER', mirrors: 'MAP_MIRRORS' }
/** A supplied FIA name is authoritative: ambiguous Bodywork cannot fall back to chassis. */
export function resolveUniversalMap(componentId, sourceName, manifest) {
  if (!manifest) return null
  const aliases = manifestAliases(manifest)
  if (sourceName) {
    const name = canonical(sourceName)
    const exact = aliases.get(name)
    if (exact) return exact
    const compound = String(sourceName).split('/').map(part => aliases.get(canonical(part)))
    if (compound.length > 1 && compound.every(map => map && map === compound[0])) return compound[0]
    return name.startsWith('floor') ? 'MAP_FLOOR' : null
  }
  return componentMaps[componentId] ?? null
}

/** Share geometry, keep visibility/materials private, never alter the loader's scene. */
export function createUniversalOverlay(scene, color, manifest) {
  const model = scene.clone(true), targets = new Map()
  const material = new MeshBasicMaterial({ color, transparent: true, opacity: .64, side: DoubleSide, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1, toneMapped: false })
  model.traverse(node => {
    if (!node.isMesh) return
    node.visible = false
    node.material = material
    node.castShadow = false
    node.receiveShadow = false
    node.renderOrder = 2
    node.raycast = () => {}
  })
  for (const [name, metadata] of Object.entries(manifest.maps)) {
    const root = model.getObjectByName(name) ?? model.getObjectByName(metadata.mesh_name)
    const meshes = []
    root?.traverse(node => { if (node.isMesh) meshes.push(node) })
    if (!meshes.length) { material.dispose(); throw new Error(`Universal mapping missing: ${name}`) }
    targets.set(name, meshes)
  }
  let active = null
  return {
    model,
    select(name) {
      active = targets.has(name) ? name : null
      model.traverse(node => { if (node.isMesh) node.visible = false })
      for (const mesh of targets.get(active) ?? []) mesh.visible = true
    },
    setColor(value) { material.color.set(value) },
    snapshot() { return { active, visible: [...targets].filter(([, meshes]) => meshes.some(mesh => mesh.visible)).map(([name]) => name) } },
    dispose() { this.select(null); material.dispose() },
  }
}
