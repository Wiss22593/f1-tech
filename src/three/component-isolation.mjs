import { universalSurfaceMasks } from './universal-maps.mjs'
import { BufferAttribute } from 'three'
import {
  componentMeshMappings, cachedGeometryParts, geometryArrayHash,
  normalizeComponentId, resolveComponentNode,
} from './component-mapping.mjs'

export const isolationBrightness = 0.28
export const isolationDuration = 0.28
export const isolationContrast = 0.12
// Reuse Halo's neutral display lift for the complete active masks, including
// dark pixels in livery atlases. Source PBR parameters/textures remain untouched.
const needsNeutralContrast = component => component === 'halo' || component.startsWith('MAP_')
  || component === 'rearSuspension' || component === 'chassis'

/** Final display-color gain preserves textures, PBR parameters, livery and shadows. */
function isolationChannel(material, components, contrastComponents = []) {
  const uniform = { value: 1 }, haloContrast = { value: 0 }
  const alpineHalo = contrastComponents.length > 0
  const beforeCompile = material.onBeforeCompile
  const cacheKey = material.customProgramCacheKey()
  material.onBeforeCompile = function (shader, renderer) {
    beforeCompile.call(this, shader, renderer)
    shader.uniforms.f1TechIsolationGain = uniform
    if (alpineHalo) shader.uniforms.f1TechHaloContrast = haloContrast
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float f1TechIsolationGain;' + (alpineHalo ? '\nuniform float f1TechHaloContrast;' : ''))
      .replace('#include <dithering_fragment>', '#include <dithering_fragment>\ngl_FragColor.rgb *= f1TechIsolationGain;' + (alpineHalo ? '\ngl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1.0), f1TechHaloContrast);' : ''))
  }
  material.customProgramCacheKey = () => `${cacheKey}|f1-tech-component-isolation-v3${alpineHalo ? "-halo-contrast" : ""}`
  return { material, components, contrastComponents, uniform, haloContrast, contrastStart: 0, contrastTarget: 0, start: 1, target: 1, baseline: { opacity: material.opacity, transparent: material.transparent, depthWrite: material.depthWrite, depthTest: material.depthTest } }
}

function cloneOriginalMaterial(material) {
  const clone = material.clone()
  clone.onBeforeCompile = material.onBeforeCompile
  clone.customProgramCacheKey = material.customProgramCacheKey
  return clone
}

/** Prepare on load/theme change only. All selectors identify complete original surfaces. */
export function createComponentIsolation(model, assetId, cloneMaterial = cloneOriginalMaterial, mapping = componentMeshMappings[assetId], universal) {
  const meshes = []
  model.traverse(node => { if (node.isMesh) meshes.push(node) })
  const entries = new Map(), targets = new Map(), invalid = new Set()
  const failures = [], cache = { hits: 0, misses: 0 }
  const add = (component, target) => {
    if (!targets.has(component)) targets.set(component, [])
    targets.get(component).push(target)
  }
  const fail = (component, reason) => {
    invalid.add(component)
    failures.push({ component, reason })
  }

  for (const rule of mapping?.meshRules ?? []) {
    const object = resolveComponentNode(model, rule.node), descendants = []
    object?.traverse(node => { if (node.isMesh) descendants.push(node) })
    const mesh = descendants[rule.primitive ?? 0], geometry = mesh?.geometry
    const position = geometry?.attributes.position
    const sourceIndex = geometry?.index?.array ?? (position && Uint32Array.from({ length: position.count }, (_, i) => i))
    const verified = mesh && position && !position.isInterleavedBufferAttribute
      && (!rule.vertices || position.count === rule.vertices)
      && (!rule.indices || sourceIndex.length === rule.indices)
      && (!rule.positionHash || geometryArrayHash(position.array) === rule.positionHash)
      && (!rule.indexHash || geometryArrayHash(sourceIndex) === rule.indexHash)
    if (!verified || (Array.isArray(mesh.material) && rule.partition !== 'groups')) {
      for (const component of Object.keys(rule.components)) fail(component, 'geometry/material fingerprint mismatch')
      continue
    }

    let parts
    if (rule.partition === 'groups') {
      // Groups must partition the draw exactly: no duplicated faces or missing ranges.
      const groups = geometry.groups, ordered = [...groups].sort((a, b) => a.start - b.start)
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      let offset = 0
      const valid = ordered.length && ordered.every(group => {
        const okay = group.start === offset && group.count % 3 === 0
          && Number.isInteger(group.materialIndex) && Boolean(materials[group.materialIndex])
        offset += group.count
        return okay
      }) && offset === sourceIndex.length
      if (!valid) {
        for (const component of Object.keys(rule.components)) fail(component, 'invalid or overlapping geometry groups')
        continue
      }
      parts = groups.map((group, groupIndex) => ({
        groupIndex, firstTriangle: group.start / 3, materialIndex: group.materialIndex,
        indices: Array.from(sourceIndex.slice(group.start, group.start + group.count)),
      }))
    } else {
      const analysis = cachedGeometryParts(geometry, assetId, rule.partition === 'indexed' ? null : rule.weldPrecision)
      cache[analysis.cacheHit ? 'hits' : 'misses']++
      parts = analysis.parts
    }

    const labels = new Map()
    for (const [component, selectors] of Object.entries(rule.components)) {
      for (const selector of selectors) {
        const part = parts.find(part => selector.groupIndex !== undefined
          ? part.groupIndex === selector.groupIndex : part.firstTriangle === selector.firstTriangle)
        if (!part || (selector.triangles !== undefined && part.indices.length !== selector.triangles * 3)) {
          fail(component, 'missing audited surface')
          continue
        }
        if (!labels.has(part.firstTriangle)) labels.set(part.firstTriangle, new Set())
        labels.get(part.firstTriangle).add(component)
        add(component, {
          type: rule.partition === 'groups' ? 'group' : 'island', node: rule.node,
          primitive: rule.primitive ?? 0, meshName: mesh.name, meshUuid: mesh.uuid, firstTriangle: part.firstTriangle,
          triangles: part.indices.length / 3, groupIndex: part.groupIndex,
        })
      }
    }
    entries.set(mesh, { parts, labels })
  }

  const objectLabels = new Map()
  for (const [component, names] of Object.entries(mapping?.objects ?? {})) {
    for (const name of names) {
      const object = resolveComponentNode(model, name), descendants = []
      object?.traverse(node => { if (node.isMesh) descendants.push(node) })
      const fingerprint = mapping?.objectFingerprints?.[name]
      const mesh = descendants[0]
      const fingerprintValid = !fingerprint || (descendants.length === 1 && mesh.geometry.index && geometryArrayHash(mesh.geometry.attributes.position.array) === fingerprint.positionHash && geometryArrayHash(mesh.geometry.index.array) === fingerprint.indexHash)
      if (!fingerprintValid) { fail(component, 'object geometry fingerprint mismatch ' + name); continue }
      if (!descendants.length) {
        fail(component, 'missing or ambiguous object ' + name)
        continue
      }
      for (const mesh of descendants) {
        if (entries.has(mesh)) {
          fail(component, 'whole-object selector overlaps a partitioned mesh')
          continue
        }
        if (!objectLabels.has(mesh)) objectLabels.set(mesh, new Set())
        objectLabels.get(mesh).add(component)
        add(component, {
          type: 'mesh', node: name, meshName: mesh.name, meshUuid: mesh.uuid,
          triangles: (mesh.geometry.index?.count ?? mesh.geometry.attributes.position?.count ?? 0) / 3,
        })
      }
    }
  }

  // A compound target is available only if every constituent is complete.
  for (const [component, children] of Object.entries(mapping?.composites ?? {})) {
    if (children.some(child => invalid.has(child) || !targets.get(child)?.length)) {
      fail(component, 'incomplete composite')
      continue
    }
    for (const child of children) for (const target of targets.get(child)) add(component, target)
    targets.set(component, [...new Map(targets.get(component).map(target => [
      target.type + ':' + target.meshUuid + ':' + (target.firstTriangle ?? 'whole'), target,
    ])).values()])
    for (const entry of entries.values()) {
      for (const labels of entry.labels.values()) {
        if (children.some(child => labels.has(child))) labels.add(component)
      }
    }
    for (const labels of objectLabels.values()) {
      if (children.some(child => labels.has(child))) labels.add(component)
    }
  }


  const surfaces = universal ? universalSurfaceMasks(model, universal.scene, universal.manifest) : null
  for (const name of surfaces?.missing ?? []) fail(name, 'universal surface does not match active car')
  for (const [mesh, mask] of surfaces?.masks ?? []) {
    const entry = entries.get(mesh), index = mesh.geometry.index?.array ?? Uint32Array.from({ length: mesh.geometry.attributes.position.count }, (_, i) => i)
    const ordinals = new Map()
    for (let i = 0; i < index.length; i += 3) ordinals.set([index[i], index[i + 1], index[i + 2]].join(','), i / 3)
    const sourceParts = entry?.parts ?? (mesh.geometry.groups.length ? mesh.geometry.groups.map(group => ({ firstTriangle: group.start / 3, indices: Array.from(index.slice(group.start, group.start + group.count)), materialIndex: group.materialIndex })) : [{ firstTriangle: 0, indices: Array.from(index), materialIndex: 0 }])
    const parts = [], labels = new Map(), counts = new Map()
    // Split existing audited partitions by mask membership, preserving old labels and source material groups.
    for (const part of sourceParts) {
      const buckets = new Map()
      for (let i = 0; i < part.indices.length; i += 3) {
        const triangle = [part.indices[i], part.indices[i + 1], part.indices[i + 2]]
        // Audited partitions retain their original triangle indices but may be noncontiguous.
        const names = mask.get(ordinals.get(triangle.join(','))) ?? new Set()
        const key = [...names].filter(name => surfaces.valid.has(name)).sort().join('|')
        if (!buckets.has(key)) buckets.set(key, { indices: [], names: key ? key.split('|') : [] })
        buckets.get(key).indices.push(...triangle)
      }
      for (const bucket of buckets.values()) {
        const firstTriangle = parts.length
        const components = new Set(entry?.labels.get(part.firstTriangle) ?? objectLabels.get(mesh) ?? [])
        for (const name of bucket.names) { components.add(name); counts.set(name, (counts.get(name) ?? 0) + bucket.indices.length / 3) }
        parts.push({ firstTriangle, indices: bucket.indices, materialIndex: part.materialIndex ?? 0 })
        labels.set(firstTriangle, components)
      }
    }
    entries.set(mesh, { parts, labels })
    for (const [name, triangles] of counts) add(name, { type: 'mesh', node: mesh.name, meshName: mesh.name, meshUuid: mesh.uuid, triangles })
  }

  const highlightable = [...targets.keys()].filter(component => !invalid.has(component) && targets.get(component).some(target => target.triangles > 0))
  const filter = labels => [...(labels ?? [])].filter(component => highlightable.includes(component))
  const channels = [], originals = [], ownedGeometries = []
  // Share private Formula Alpha clones only by source identity AND semantic membership.
  const materialBuckets = new Map()
  const privateMaterial = (source, components) => {
    if (mapping?.geometryProfile !== 'formula-alpha-2026') {
      const material = cloneMaterial(source)
      channels.push(isolationChannel(material, components))
      return material
    }
    let buckets = materialBuckets.get(source)
    if (!buckets) { buckets = new Map(); materialBuckets.set(source, buckets) }
    const key = [...components].sort().join('|')
    if (!buckets.has(key)) {
      const material = cloneMaterial(source)
      channels.push(isolationChannel(material, components, components.filter(component => needsNeutralContrast(component))))
      buckets.set(key, material)
    }
    return buckets.get(key)
  }
  for (const mesh of meshes) {
    originals.push({ mesh, geometry: mesh.geometry, material: mesh.material, castShadow: mesh.castShadow, receiveShadow: mesh.receiveShadow, renderOrder: mesh.renderOrder })
    mesh.castShadow = true
    mesh.receiveShadow = true
    const entry = entries.get(mesh)
    if (entry) {
      const sourceMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material], buckets = new Map()
      // Merge islands with equal semantic memberships and source material into one draw.
      // A surface shared by floor/diffuser or a corner is still drawn exactly once.
      for (const part of entry.parts) {
        const components = filter(entry.labels.get(part.firstTriangle)), materialIndex = part.materialIndex ?? 0
        const key = materialIndex + ':' + components.sort().join('|')
        if (!buckets.has(key)) buckets.set(key, { components, materialIndex, parts: [] })
        buckets.get(key).parts.push(part)
      }
      const geometry = mesh.geometry.clone(), sourceIndex = mesh.geometry.index?.array
      const Type = sourceIndex?.constructor ?? Uint32Array
      const reordered = new Type(entry.parts.reduce((sum, part) => sum + part.indices.length, 0))
      const materials = []
      geometry.clearGroups()
      let offset = 0
      for (const { components, materialIndex, parts } of buckets.values()) {
        const count = parts.reduce((sum, part) => sum + part.indices.length, 0)
        geometry.addGroup(offset, count, materials.length)
        for (const part of parts) {
          reordered.set(part.indices, offset)
          offset += part.indices.length
        }
        materials.push(privateMaterial(sourceMaterials[materialIndex], components))
      }
      geometry.setIndex(new BufferAttribute(reordered, 1))
      mesh.geometry = geometry
      mesh.material = materials
      ownedGeometries.push(geometry)
    } else {
      const components = filter(objectLabels.get(mesh))
      const materials = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map(source => privateMaterial(source, components))
      mesh.material = Array.isArray(mesh.material) ? materials : materials[0]
    }
  }

  let mode = 'normal'
  let active, elapsed = isolationDuration, disposed = false
  const targetList = component => {
    const canonical = normalizeComponentId(component) ?? component
    return highlightable.includes(canonical) ? targets.get(canonical) : []
  }
  return {
    highlightable,
    universalBounds: surfaces?.bounds ?? new Map(),
    select(component) {
      if (disposed) return
      const canonical = normalizeComponentId(component) ?? component
      active = targetList(canonical).length && channels.some(channel => channel.components.includes(canonical)) ? canonical : undefined
      mode = !active ? 'normal' : mapping?.internalComponents?.includes(active) ? 'internal' : 'external'
      elapsed = 0
      for (const channel of channels) {
        const target = active && channel.components.includes(active)
        const wasTransparent = channel.material.transparent
        Object.assign(channel.material, channel.baseline)
        if (mode === 'internal') {
          // Opaque targets bypass occluder depth; ghost groups never write depth.
          channel.material.transparent = !target
          channel.material.opacity = target ? 1 : 0.10
          channel.material.depthWrite = false
          channel.material.depthTest = !target
        }
        if (mapping?.geometryProfile !== 'formula-alpha-2026' || wasTransparent !== channel.material.transparent) channel.material.needsUpdate = true
        // A multiplicative gain cannot reveal nearly black authored surfaces. Reuse
        // the existing Halo contrast channel only for eligible active surfaces.
        channel.contrastStart = channel.haloContrast.value
        channel.contrastTarget = mapping?.geometryProfile === 'formula-alpha-2026' && target && channel.contrastComponents.includes(active) ? isolationContrast : 0
        channel.start = channel.uniform.value
        channel.target = !active || channel.components.includes(active) ? 1 : isolationBrightness
      }
    },
    step(delta) {
      if (disposed || elapsed >= isolationDuration) return false
      elapsed = Math.min(elapsed + delta, isolationDuration)
      const progress = elapsed / isolationDuration, eased = progress * progress * (3 - 2 * progress)
      for (const channel of channels) {
        channel.haloContrast.value = progress === 1 ? channel.contrastTarget : channel.contrastStart + (channel.contrastTarget - channel.contrastStart) * eased
        channel.uniform.value = progress === 1 ? channel.target : channel.start + (channel.target - channel.start) * eased
      }
      return elapsed < isolationDuration
    },
    resolveTargets: targetList,
    snapshot() {
      return {
        assetId, mode, active: active ?? null, highlightable: [...highlightable],
        targetCount: active ? targetList(active).length : 0,
        targets: Object.fromEntries(highlightable.map(component => [component, targetList(component)])),
        failures: [...failures], cache: { ...cache },
        materials: channels.map(channel => ({
          materialName: channel.material.name, component: channel.components[0] ?? null, components: [...channel.components],
          opacity: channel.material.opacity, transparent: channel.material.transparent, depthWrite: channel.material.depthWrite, depthTest: channel.material.depthTest,
          gain: channel.uniform.value, focusTint: 0, haloContrast: channel.haloContrast.value, uuid: channel.material.uuid,
        })),
        geometries: ownedGeometries.length, disposed,
      }
    },
    dispose() {
      if (disposed) return
      disposed = true
      active = undefined
      for (const channel of channels) {
        channel.uniform.value = 1
        channel.haloContrast.value = 0
        channel.material.dispose()
      }
      for (const original of originals) {
        original.mesh.geometry = original.geometry
        original.mesh.material = original.material
        original.mesh.castShadow = original.castShadow
        original.mesh.receiveShadow = original.receiveShadow
        original.mesh.renderOrder = original.renderOrder
      }
      for (const geometry of ownedGeometries) geometry.dispose()
    },
  }
}
