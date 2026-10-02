import mappings from './component-mesh-map.json' with { type: 'json' }
import { teamModelManifest } from './model-manifest.mjs'
// All eleven current exports share the audited Formula Alpha geometry. Each
// selector still validates its geometry fingerprint; skins never select pieces.
const formulaAlphaMapping = mappings['alpine-a526-formulatech-evaluation']
export const componentMeshMappings = {
  ...mappings,
  ...Object.fromEntries(Object.values(teamModelManifest).map(asset => [asset.assetId, formulaAlphaMapping])),
}
export function geometryArrayHash(array) {
  let hash = 2166136261
  for (const byte of new Uint8Array(array.buffer, array.byteOffset, array.byteLength)) hash = Math.imul(hash ^ byte, 16777619)
  return (hash >>> 0).toString(16).padStart(8, '0')
}
/** Whole indexed surfaces; optional welding is for topology comparison, never spatial cuts. */
export function connectedTriangleParts(position, index, precision) {
  const parent = Int32Array.from({ length: position.length / 3 }, (_, i) => i)
  const find = value => { while (parent[value] !== value) { parent[value] = parent[parent[value]]; value = parent[value] } return value }
  const union = (a, b) => { a = find(a); b = find(b); if (a !== b) parent[b] = a }
  const positions = new Map()
  for (let i = 0; precision && i < parent.length; i++) {
    const key = `${Math.round(position[i * 3] * precision)},${Math.round(position[i * 3 + 1] * precision)},${Math.round(position[i * 3 + 2] * precision)}`
    const previous = positions.get(key)
    if (previous !== undefined) union(i, previous); else positions.set(key, i)
  }
  for (let i = 0; i < index.length; i += 3) { union(index[i], index[i + 1]); union(index[i], index[i + 2]) }
  const parts = new Map()
  for (let i = 0; i < index.length; i += 3) {
    const root = find(index[i])
    if (!parts.has(root)) parts.set(root, { firstTriangle: i / 3, indices: [] })
    parts.get(root).indices.push(index[i], index[i + 1], index[i + 2])
  }
  return [...parts.values()]
}
const aliases = {
  cooling: 'cooling', radiators: 'cooling', frontwing: 'frontWing', frontwingendplate: 'frontWing', rearwing: 'rearWing', rearwingendplate: 'rearWing', floor: 'floor', flooredge: 'floor', floorbody: 'floor', floorfences: 'floor', floorleadingedgedevices: 'floor',
  sidepods: 'sidepods', sidepod: 'sidepods', sidepodinlet: 'sidepods', nose: 'nose', halo: 'halo', enginecover: 'engineCover', cokeenginecover: 'engineCover',
  frontsuspension: 'frontSuspension', rearsuspension: 'rearSuspension', diffuser: 'diffuser', wheels: 'wheels', wheelstyres: 'wheels',
  frontcorner: 'frontCorner', rearcorner: 'rearCorner', frontbrake: 'frontBrake', rearbrake: 'rearBrake', cockpit: 'chassis', chassis: 'chassis', steeringwheel: 'steeringWheel', onboardcamera: 'onboardCamera', tvcamera: 'onboardCamera', mirrors: 'mirrors', mirror: 'mirrors', frontwheels: 'frontWheels', rearwheels: 'rearWheels',
}
/** Component spelling only; Front Drum/Corner never become Front Suspension. */
export function normalizeComponentId(value) { return aliases[String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')] ?? null }
const topologyCache = new WeakMap()
/** Shared GLTF geometries retain analysis across private model/theme clones. */
export function cachedGeometryParts(geometry, assetId, precision) {
  const position = geometry.attributes.position.array, index = geometry.index?.array ?? Uint32Array.from({length: geometry.attributes.position.count}, (_, i) => i)
  const fingerprint = geometryArrayHash(position) + ':' + geometryArrayHash(index)
  let entry = topologyCache.get(geometry)
  if (!entry || entry.fingerprint !== fingerprint) { entry = { fingerprint, partitions: new Map() }; topologyCache.set(geometry, entry) }
  const key = assetId + ':' + (precision || 'indexed')
  const hit = entry.partitions.has(key)
  if (!hit) entry.partitions.set(key, connectedTriangleParts(position, index, precision))
  return { parts: entry.partitions.get(key), fingerprint, cacheHit: hit }
}
/** Exact name first; spelling normalization is allowed only for one unique node. */
export function resolveComponentNode(model, name) {
  const matches = [], normalized = String(name).toLowerCase().replace(/[^a-z0-9]/g, '')
  model.traverse(node => { if (node.name && node.name.toLowerCase().replace(/[^a-z0-9]/g, '') === normalized) matches.push(node) })
  return matches.length === 1 ? matches[0] : null
}
/** Kept as a pure inventory gate; runtime additionally requires real resolved targets. */
export function resolveHighlightableComponents(assetId, validRules, objectNames, mapping = componentMeshMappings[assetId]) {
  if (!mapping) return []
  const components = new Set((mapping.meshRules ?? []).flatMap(rule => Object.keys(rule.components)))
  const result = [...components].filter(component => mapping.meshRules.every(rule => !rule.components[component] || validRules.includes(rule)))
  for (const [component, names] of Object.entries(mapping.objects ?? {})) if (names.length && names.every(name => objectNames.includes(name))) result.push(component)
  for (const [component, children] of Object.entries(mapping.composites ?? {})) if (children.every(child => result.includes(child))) result.push(component)
  return [...new Set(result)]
}

/** Geometry selection is separate from FIA publication/visualizable metadata. */
export function resolveInspectionComponent(componentId, sourceName) {
  const name = String(sourceName ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
  if (['frontdrum', 'reardrum', 'beamwing', 'airbox', 'coolinglouvres', 'coolinglouvers'].includes(name)) return null
  return normalizeComponentId(sourceName) ?? normalizeComponentId(componentId)
}
