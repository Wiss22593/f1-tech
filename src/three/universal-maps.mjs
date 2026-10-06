import { Box3, Vector3 } from 'three'
import legacyAliases from './universal-map-aliases.json' with { type: 'json' }
import { alpineInspectionViews } from './alpine-focus.mjs'

export const universalMapsPath = '/models/F1tech_maps.glb'
export const universalMapsManifestPath = '/models/F1tech_maps_manifest.json'
let manifestRequest
export function loadUniversalMapsManifest() {
  return manifestRequest ??= fetch(universalMapsManifestPath).then(response => {
    if (!response.ok) throw new Error('Universal maps manifest: ' + response.status)
    return response.json()
  }).then(manifest => {
    return normalizeUniversalManifest(manifest)
  }).catch(error => { manifestRequest = null; throw error })
}
const aliasCache = new WeakMap()
function manifestAliases(manifest) {
  if (!aliasCache.has(manifest)) aliasCache.set(manifest, new Map(Object.entries(manifest.fia_aliases ?? legacyAliases).map(([name, map]) => [canonical(name), map])))
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


/** Reexports may contain only changed metadata; names and aliases retain their original contract. */
export function normalizeUniversalManifest(manifest) {
  if (manifest.format !== 'F1TECH_UNIVERSAL_MAPS' || !manifest.maps) throw new Error('Invalid universal maps manifest')
  const names = manifest.maps_exported ?? Object.keys(manifest.maps)
  return { ...manifest, maps: Object.fromEntries(names.map(name => [name, { mesh_name: name + '_MESH', ...manifest.maps[name] }])), fia_aliases: manifest.fia_aliases ?? legacyAliases }
}

const vertexKey = v => [v.x, v.y, v.z].map(n => Math.round(n * 1e4)).join(',')
const triangleKey = vertices => vertices.sort().join('|')
/** Maps are selection masks only. Render original car surfaces, retaining every team's PBR materials. */
export function universalSurfaceMasks(model, scene, manifest) {
  manifest = normalizeUniversalManifest(manifest)
  model.updateMatrixWorld(true); scene.updateMatrixWorld(true)
  const lookup = new Map(), bounds = new Map(), expected = new Map()
  const v = new Vector3()
  // Coordinates relative to each scene root, independent of the viewer's shared transform.
  const keys = (mesh, root) => {
    const matrix = root.matrixWorld.clone().invert().multiply(mesh.matrixWorld)
    return Array.from({ length: mesh.geometry.attributes.position.count }, (_, i) => vertexKey(v.fromBufferAttribute(mesh.geometry.attributes.position, i).applyMatrix4(matrix)))
  }
  for (const [name, metadata] of Object.entries(manifest.maps)) {
    const root = scene.getObjectByName(name) ?? scene.getObjectByName(metadata.mesh_name)
    if (!root) throw new Error('Universal mapping missing: ' + name)
    const box = new Box3(), signatures = new Set()
    root.traverse(mesh => {
      if (!mesh.isMesh) return
      const vertices = keys(mesh, scene), index = mesh.geometry.index
      const matrix = scene.matrixWorld.clone().invert().multiply(mesh.matrixWorld)
      for (let i = 0, count = index?.count ?? vertices.length; i < count; i += 3) {
        const indices = [0, 1, 2].map(offset => index ? index.getX(i + offset) : i + offset)
        const key = triangleKey(indices.map(j => vertices[j]))
        signatures.add(key)
        if (!lookup.has(key)) lookup.set(key, new Set())
        lookup.get(key).add(name)
        for (const j of indices) box.expandByPoint(v.fromBufferAttribute(mesh.geometry.attributes.position, j).applyMatrix4(matrix))
      }
    })
    expected.set(name, signatures); bounds.set(name, box)
  }
  const masks = new Map(), matched = new Map([...expected.keys()].map(name => [name, new Set()]))
  model.traverse(mesh => {
    if (!mesh.isMesh) return
    const vertices = keys(mesh, model), index = mesh.geometry.index, labels = new Map()
    for (let i = 0, count = index?.count ?? vertices.length; i < count; i += 3) {
      const key = triangleKey([0, 1, 2].map(offset => vertices[index ? index.getX(i + offset) : i + offset]))
      const names = lookup.get(key)
      if (names) { labels.set(i / 3, names); for (const name of names) matched.get(name).add(key) }
    }
    if (labels.size) masks.set(mesh, labels)
  })
  const valid = new Set([...expected].filter(([name, signatures]) => signatures.size && matched.get(name).size === signatures.size).map(([name]) => name))
  return { masks, bounds, valid, missing: [...expected.keys()].filter(name => !valid.has(name)) }
}

/** Bounds fit enters the same CameraFocus tween; old directions/durations and orbit limits are retained. */
export function universalInspectionView(name, bounds, matrix, aspect = 1.44) {
  const box = bounds.clone().applyMatrix4(matrix), target = box.getCenter(new Vector3())
  const family = name === 'MAP_NOSE' ? 'frontWing' : name === 'MAP_MIRRORS' ? 'mirrors' : ['MAP_DIFFUSER', 'MAP_BEAM_WING', 'MAP_EXHAUST', 'MAP_RIS', 'MAP_TAIL'].includes(name) ? 'rearWing' : 'chassis'
  const preset = alpineInspectionViews[family]
  const underside = name === 'MAP_FLOOR' || name === 'MAP_DIFFUSER'
  const direction = underside ? new Vector3(3.9, -4.02, name === 'MAP_DIFFUSER' ? -4.5 : 4.5).normalize() : new Vector3(...preset.position).sub(new Vector3(...preset.target)).normalize()
  const radius = box.getSize(new Vector3()).length() / 2
  const halfFov = Math.min(Math.PI / 9, Math.atan(Math.tan(Math.PI / 9) * aspect))
  const distance = Math.max(3, radius / Math.sin(halfFov) * 1.08)
  return { target: target.toArray(), position: target.clone().addScaledVector(direction, Math.min(15, distance)).toArray(), duration: name === 'MAP_FLOOR' ? 940 : preset.duration }
}
