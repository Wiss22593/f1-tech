import mappings from './component-mesh-map.json' with { type: 'json' }
export const componentMeshMappings = mappings
export function geometryArrayHash(array) {
  let hash = 2166136261
  for (const byte of new Uint8Array(array.buffer, array.byteOffset, array.byteLength)) hash = Math.imul(hash ^ byte, 16777619)
  return (hash >>> 0).toString(16).padStart(8, '0')
}
/** Whole connected surfaces, welded only at coincident vertices; never spatial cuts. */
export function connectedTriangleParts(position, index, precision) {
  const parent = Int32Array.from({ length: position.length / 3 }, (_, i) => i)
  const find = value => { while (parent[value] !== value) { parent[value] = parent[parent[value]]; value = parent[value] } return value }
  const union = (a, b) => { a = find(a); b = find(b); if (a !== b) parent[b] = a }
  const positions = new Map()
  for (let i = 0; i < parent.length; i++) {
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
/** Fail closed if any required surface of a composite piece is missing. */
export function resolveHighlightableComponents(assetId, validRules, objectNames) {
  const mapping = mappings[assetId]
  if (!mapping) return []
  const components = new Set(mapping.meshRules.flatMap(rule => Object.keys(rule.components)))
  const result = [...components].filter(component => mapping.meshRules.every(rule => !rule.components[component] || validRules.includes(rule)))
  for (const [component, names] of Object.entries(mapping.objects)) if (names.length && names.every(name => objectNames.includes(name))) result.push(component)
  return result
}
