import { BufferAttribute } from 'three'
import { componentMeshMappings, connectedTriangleParts, geometryArrayHash, resolveHighlightableComponents } from './component-mapping.mjs'
export const isolationBrightness = 0.28
export const isolationDuration = 0.28

/** Final display-color gain preserves textures, PBR parameters, livery and shadows. */
function isolationChannel(material, component) {
  const uniform = { value: 1 }
  const beforeCompile = material.onBeforeCompile
  const cacheKey = material.customProgramCacheKey()
  material.onBeforeCompile = function (shader, renderer) {
    beforeCompile.call(this, shader, renderer)
    shader.uniforms.f1TechIsolationGain = uniform
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float f1TechIsolationGain;')
      .replace('#include <dithering_fragment>', '#include <dithering_fragment>\ngl_FragColor.rgb *= f1TechIsolationGain;')
  }
  material.customProgramCacheKey = () => `${cacheKey}|f1-tech-component-isolation-v2`
  return { material, component, uniform, start: 1, target: 1 }
}
function cloneOriginalMaterial(material) {
  const clone = material.clone()
  clone.onBeforeCompile = material.onBeforeCompile
  clone.customProgramCacheKey = material.customProgramCacheKey
  return clone
}
/** Prepare once per model/theme; cached GLTF resources and shared textures are read-only. */
export function createComponentIsolation(model, assetId, cloneMaterial = cloneOriginalMaterial) {
  const mapping = componentMeshMappings[assetId]
  const meshRules = new Map(), validRules = []
  for (const rule of mapping?.meshRules ?? []) {
    const object = model.getObjectByName(rule.node)
    const mesh = object?.isMesh ? (rule.primitive === 0 ? object : null) : object?.children.filter(child => child.isMesh)[rule.primitive]
    const geometry = mesh?.geometry, position = geometry?.attributes.position, index = geometry?.index
    if (!mesh || Array.isArray(mesh.material) || !position || position.isInterleavedBufferAttribute || !index || position.count !== rule.vertices || index.count !== rule.indices || geometryArrayHash(position.array) !== rule.positionHash || geometryArrayHash(index.array) !== rule.indexHash) continue
    const parts = connectedTriangleParts(position.array, index.array, rule.weldPrecision), labels = new Map()
    let valid = true
    for (const [component, selectors] of Object.entries(rule.components)) for (const selector of selectors) {
      const part = parts.find(part => part.firstTriangle === selector.firstTriangle)
      if (!part || part.indices.length !== selector.triangles * 3 || labels.has(part.firstTriangle)) { valid = false; break }
      labels.set(part.firstTriangle, component)
    }
    if (!valid) continue
    meshRules.set(mesh, { parts, labels }); validRules.push(rule)
  }
  const meshes = []
  model.traverse(node => { if (node.isMesh) meshes.push(node) })
  const highlightable = resolveHighlightableComponents(assetId, validRules, meshes.map(mesh => mesh.name))
  const channels = [], originals = [], ownedGeometries = []
  for (const mesh of meshes) {
    originals.push({ mesh, geometry: mesh.geometry, material: mesh.material, castShadow: mesh.castShadow, receiveShadow: mesh.receiveShadow })
    mesh.castShadow = true; mesh.receiveShadow = true
    const rule = meshRules.get(mesh)
    if (rule && !Array.isArray(mesh.material)) {
      const buckets = new Map()
      for (const part of rule.parts) {
        const label = rule.labels.get(part.firstTriangle), component = highlightable.includes(label) ? label : undefined
        if (!buckets.has(component)) buckets.set(component, [])
        buckets.get(component).push(part.indices)
      }
      const geometry = mesh.geometry.clone(), reordered = new mesh.geometry.index.array.constructor(mesh.geometry.index.count)
      geometry.clearGroups()
      const materials = []
      let offset = 0
      for (const [component, parts] of buckets) {
        const count = parts.reduce((sum, indices) => sum + indices.length, 0)
        geometry.addGroup(offset, count, materials.length)
        for (const indices of parts) { reordered.set(indices, offset); offset += indices.length }
        const material = cloneMaterial(mesh.material)
        materials.push(material); channels.push(isolationChannel(material, component))
      }
      geometry.setIndex(new BufferAttribute(reordered, 1))
      mesh.geometry = geometry; mesh.material = materials; ownedGeometries.push(geometry)
    } else {
      const component = Object.entries(mapping?.objects ?? {}).find(([component, names]) => highlightable.includes(component) && names.includes(mesh.name))?.[0]
      const materials = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map(source => {
        const material = cloneMaterial(source); channels.push(isolationChannel(material, component)); return material
      })
      mesh.material = Array.isArray(mesh.material) ? materials : materials[0]
    }
  }
  let active, elapsed = isolationDuration, disposed = false
  return {
    highlightable,
    select(component) {
      if (disposed) return
      active = highlightable.includes(component) ? component : undefined; elapsed = 0
      for (const channel of channels) { channel.start = channel.uniform.value; channel.target = !active || channel.component === active ? 1 : isolationBrightness }
    },
    step(delta) {
      if (disposed || elapsed >= isolationDuration) return false
      elapsed = Math.min(elapsed + delta, isolationDuration)
      const progress = elapsed / isolationDuration, eased = progress * progress * (3 - 2 * progress)
      for (const channel of channels) channel.uniform.value = progress === 1 ? channel.target : channel.start + (channel.target - channel.start) * eased
      return elapsed < isolationDuration
    },
    snapshot() { return { assetId, active: active ?? null, highlightable: [...highlightable], materials: channels.map(channel => ({ component: channel.component ?? null, gain: channel.uniform.value, uuid: channel.material.uuid })), geometries: ownedGeometries.length, disposed } },
    dispose() {
      if (disposed) return
      disposed = true; active = undefined
      for (const channel of channels) { channel.uniform.value = 1; channel.material.dispose() }
      for (const original of originals) { original.mesh.geometry = original.geometry; original.mesh.material = original.material; original.mesh.castShadow = original.castShadow; original.mesh.receiveShadow = original.receiveShadow }
      for (const geometry of ownedGeometries) geometry.dispose()
    },
  }
}
