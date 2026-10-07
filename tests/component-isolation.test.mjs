import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { BufferAttribute, BufferGeometry, Group, Mesh, MeshStandardMaterial, Scene, Texture } from 'three'
import { componentMeshMappings, connectedTriangleParts, resolveHighlightableComponents } from '../src/three/component-mapping.mjs'
import { createComponentIsolation, isolationBrightness } from '../src/three/component-isolation.mjs'
const ids = ['bgrt-f1-concept-2026-evaluation', 'alpine-a526-formulatech-evaluation']
const names = ['FL_Wheel', 'FR_Wheel', 'RL_Wheel', 'RR_Wheel', 'cockpit']
const coverage = ['floor', 'frontWing', 'rearWing', 'frontSuspension', 'rearSuspension', 'frontBrake', 'rearBrake', 'onboardCamera', 'diffuser', 'nose', 'halo', 'sidepods', 'engineCover', 'mirrors', 'wheels', 'frontWheels', 'rearWheels', 'chassis', 'frontCorner', 'rearCorner']
const expectedCoverage = id => id.startsWith('alpine') ? ['frontWing','rearWing','halo','frontSuspension','rearSuspension','mirrors','frontWheels','rearWheels','cooling','chassis','frontCorner','rearCorner','wheels'] : coverage
const sameCoverage = (actual, id = ids[0]) => assert.deepEqual([...actual].sort(), [...expectedCoverage(id)].sort())
const sources = new Map()
for (const id of ids) {
  try {
    const bytes = await readFile(new URL(`../public/models/${componentMeshMappings[id].file}`, import.meta.url)), length = bytes.readUInt32LE(12)
    sources.set(id, { bytes, gltf: JSON.parse(bytes.subarray(20, 20 + length).toString()), binary: bytes.subarray(28 + length) })
  } catch (error) { if (error.code !== 'ENOENT') throw error }
}
function sourceScene(id) {
  const { gltf, binary } = sources.get(id), scene = new Scene()
  const accessor = index => {
    const a = gltf.accessors[index], v = gltf.bufferViews[a.bufferView], Type = a.componentType === 5126 ? Float32Array : a.componentType === 5125 ? Uint32Array : Uint16Array
    return new Type(binary.buffer, binary.byteOffset + v.byteOffset + (a.byteOffset ?? 0), a.count * ({ VEC3: 3, VEC2: 2, SCALAR: 1 }[a.type]))
  }
  const materials = gltf.materials.map(spec => { const material = new MeshStandardMaterial(); material.name = spec.name; material.map = new Texture(); material.color.fromArray(spec.pbrMetallicRoughness?.baseColorFactor ?? [1, 1, 1]); return material })
  for (const node of gltf.nodes.filter(node => node.mesh !== undefined)) {
    const children = gltf.meshes[node.mesh].primitives.map(p => {
      const geometry = new BufferGeometry()
      geometry.setAttribute('position', new BufferAttribute(accessor(p.attributes.POSITION), 3))
      geometry.setAttribute('normal', new BufferAttribute(accessor(p.attributes.NORMAL), 3))
      geometry.setAttribute('uv', new BufferAttribute(accessor(p.attributes.TEXCOORD_0), 2))
      geometry.setIndex(new BufferAttribute(accessor(p.indices), 1))
      return new Mesh(geometry, materials[p.material])
    })
    const object = children.length === 1 ? children[0] : new Group()
    if (children.length > 1) children.forEach(child => object.add(child))
    object.name = node.name; scene.add(object)
  }
  return scene
}
function originals(scene) {
  const result = []
  scene.traverse(mesh => { if (mesh.isMesh) result.push({ mesh, material: mesh.material, geometry: mesh.geometry, color: mesh.material.color.clone(), map: mesh.material.map }) })
  return result
}
test('topology partitions preserve whole connected surfaces and all original triangles', () => {
  const position = Float32Array.from([0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 8, 0, 0, 9, 0, 0, 8, 1, 0]), index = Uint16Array.from([0, 1, 2, 3, 4, 5, 6, 7, 8])
  assert.deepEqual(connectedTriangleParts(position, index, 1000000), [{ firstTriangle: 0, indices: [0, 1, 2, 3, 4, 5] }, { firstTriangle: 2, indices: [6, 7, 8] }])
})
test('BGRT and Alpine resolve distinct audited mappings for complete composite pieces', () => {
  for (const id of ids) sameCoverage(resolveHighlightableComponents(id, componentMeshMappings[id].meshRules, sources.get(id).gltf.nodes.map(node => node.name)), id)
  assert.notDeepEqual(componentMeshMappings[ids[0]].meshRules, componentMeshMappings[ids[1]].meshRules)
})
test('unknown asset, unknown component and missing real surfaces cannot highlight', () => {
  assert.deepEqual(resolveHighlightableComponents('unknown', [], names), [])
  for (const id of ids) {
    assert.deepEqual(resolveHighlightableComponents(id, [], []), [])
    assert.ok(!resolveHighlightableComponents(id, [], names.slice(1)).includes('wheels'))
    const scene = new Scene(), mesh = new Mesh(new BufferGeometry(), new MeshStandardMaterial())
    mesh.name = 'Livery'; scene.add(mesh)
    const controller = createComponentIsolation(scene, id)
    for (const component of ['frontWing', 'unknown']) { controller.select(component); controller.step(1); assert.equal(controller.snapshot().active, null); assert.ok(controller.snapshot().materials.every(m => m.gain === 1)) }
    controller.dispose()
  }
})
for (const id of ids) {
  test(`${id}: unchanged GLB, real mapping and original vertex/normal/UV/triangle preservation`, { skip: !sources.has(id) && 'Local evaluation GLB unavailable' }, () => {
    assert.equal(createHash('sha256').update(sources.get(id).bytes).digest('hex'), componentMeshMappings[id].sha256)
    const scene = sourceScene(id), before = originals(scene), controller = createComponentIsolation(scene, id)
    sameCoverage(controller.highlightable, id)
    for (const { mesh, geometry } of before) {
      for (const name of ['position', 'normal', 'uv']) assert.deepEqual(mesh.geometry.attributes[name].array, geometry.attributes[name].array)
      const triangles = g => { const a = g.index.array, result = []; for (let i = 0; i < a.length; i += 3) result.push(`${a[i]},${a[i + 1]},${a[i + 2]}`); return result.sort() }
      assert.deepEqual(triangles(mesh.geometry), triangles(geometry))
    }
    controller.dispose()
  })
  test(`${id}: selected pieces stay original; wheels dim; references restore and owned resources dispose`, { skip: !sources.has(id) }, () => {
    const scene = sourceScene(id), before = originals(scene), controller = createComponentIsolation(scene, id)
    for (const component of id.startsWith('alpine') ? ['frontWing', 'rearWing', 'halo'] : ['frontWing', 'rearWing', 'floor']) {
      controller.select(component); controller.step(1)
      const state = controller.snapshot(); assert.equal(state.active, component)
      for (const m of state.materials) assert.equal(m.gain, m.components.includes(component) ? 1 : isolationBrightness)
      assert.ok(state.materials.filter(m => m.component === 'wheels').every(m => m.gain === isolationBrightness))
    }
    for (const component of (id.startsWith('alpine') ? ['nose','floor','frontBrake','rearBrake','frontDrum','unmapped',undefined] : ['cooling','frontDrum','unmapped',undefined])) { controller.select(component); controller.step(1); assert.equal(controller.snapshot().active, null); assert.ok(controller.snapshot().materials.every(m => m.gain === 1)) }
    const disposedMaterials = new Set(), disposedGeometries = new Set()
    scene.traverse(mesh => { if (mesh.isMesh) { for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) m.addEventListener('dispose', () => disposedMaterials.add(m)); if (!before.some(source => source.geometry === mesh.geometry)) mesh.geometry.addEventListener('dispose', () => disposedGeometries.add(mesh.geometry)) } })
    const state = controller.snapshot(); controller.dispose(); controller.dispose()
    assert.equal(disposedMaterials.size, state.materials.length); assert.equal(disposedGeometries.size, state.geometries)
    for (const source of before) { assert.equal(source.mesh.material, source.material); assert.equal(source.mesh.geometry, source.geometry); assert.ok(source.material.color.equals(source.color)); assert.equal(source.material.map, source.map) }
  })
  test(`${id}: smooth transitions and repeated selections allocate no new materials`, { skip: !sources.has(id) }, () => {
    const controller = createComponentIsolation(sourceScene(id), id), initial = controller.snapshot()
    controller.select('rearWing'); controller.step(0.14)
    assert.ok(controller.snapshot().materials.some(m => m.gain > isolationBrightness && m.gain < 1))
    for (let i = 0; i < 100; i++) { controller.select(i % 2 ? 'frontWing' : 'rearWing'); controller.step(0.016) }
    assert.deepEqual(controller.snapshot().materials.map(m => m.uuid), initial.materials.map(m => m.uuid)); assert.equal(controller.snapshot().geometries, initial.geometries)
    controller.select(undefined); controller.step(1); assert.ok(controller.snapshot().materials.every(m => m.gain === 1)); controller.dispose()
  })
}
test('changing assets cleans the prior model before preparing the next one', { skip: sources.size < 2 }, () => {
  const old = sourceScene(ids[0]), next = sourceScene(ids[1]), before = originals(old), controller = createComponentIsolation(old, ids[0])
  controller.select('floor'); controller.step(1); controller.dispose()
  for (const source of before) { assert.equal(source.mesh.material, source.material); assert.equal(source.mesh.geometry, source.geometry) }
  const nextController = createComponentIsolation(next, ids[1]); assert.equal(nextController.snapshot().active, null); assert.ok(nextController.snapshot().materials.every(m => m.gain === 1)); nextController.dispose()
})

test('the isolation shader composes with existing material hooks and preserves solid rendering', () => {
  const scene = new Scene(), source = new MeshStandardMaterial({ color: '#1259a8', roughness: 0.3, metalness: 0.4 })
  const beforeCompile = function (shader) { shader.uniforms.originalLivery = { value: 7 }; shader.fragmentShader += '\n// original livery pass' }
  source.onBeforeCompile = beforeCompile
  source.customProgramCacheKey = () => 'original-livery'
  const mesh = new Mesh(new BufferGeometry(), source); scene.add(mesh)
  const controller = createComponentIsolation(scene, 'unmapped-model')
  const shader = { uniforms: {}, fragmentShader: '#include <common>\n#include <dithering_fragment>' }
  mesh.material.onBeforeCompile(shader, {})
  assert.equal(shader.uniforms.originalLivery.value, 7)
  assert.equal(shader.uniforms.f1TechIsolationGain.value, 1)
  assert.match(shader.fragmentShader, /original livery pass/)
  assert.match(shader.fragmentShader, /gl_FragColor\.rgb \*= f1TechIsolationGain/)
  assert.equal(mesh.material.customProgramCacheKey(), 'original-livery|f1-tech-component-isolation-v3')
  assert.equal(mesh.material.transparent, false)
  assert.equal(mesh.material.opacity, 1)
  assert.equal(mesh.material.roughness, source.roughness)
  assert.equal(mesh.material.metalness, source.metalness)
  assert.ok(mesh.material.color.equals(source.color))
  controller.dispose()
  assert.equal(source.onBeforeCompile, beforeCompile)
})

test('changed topology or unsupported material groups disable incomplete composite highlights', { skip: sources.size < 2 }, () => {
  for (const id of [ids[0]]) for (const mode of ['changed-topology', 'material-groups']) {
    const scene = sourceScene(id), carbon = scene.getObjectByName('carbon')
    if (mode === 'material-groups') carbon.material = [carbon.material]
    else { carbon.geometry = carbon.geometry.clone(); carbon.geometry.attributes.position.array[0] += 1 }
    const controller = createComponentIsolation(scene, id)
    assert.ok(!controller.highlightable.includes('floor')); assert.ok(controller.highlightable.includes('nose')); assert.ok(controller.highlightable.includes('wheels'))
    for (const component of ['floor', 'frontWing', 'rearWing']) {
      controller.select(component); controller.step(1)
      assert.equal(controller.snapshot().active, null)
      assert.ok(controller.snapshot().materials.every(material => material.gain === 1))
    }
    controller.dispose()
  }
})


test('empty geometry targets restore the complete car after a previous isolation', () => {
  const scene = new Scene();
  const fullGeometry = new BufferGeometry();
  fullGeometry.setAttribute('position', new BufferAttribute(new Float32Array([0,0,0,1,0,0,0,1,0]), 3));
  const full = new Mesh(fullGeometry, new MeshStandardMaterial()); full.name = 'Full'; scene.add(full);
  const empty = new Mesh(new BufferGeometry(), new MeshStandardMaterial()); empty.name = 'Empty'; scene.add(empty);
  const controller = createComponentIsolation(scene, 'test-empty', undefined, { objects: { frontWing: ['Full'], cooling: ['Empty'] } });
  controller.select('frontWing'); controller.step(1);
  assert.equal(controller.snapshot().active, 'frontWing');
  controller.select('cooling'); controller.step(1);
  assert.equal(controller.snapshot().mode, 'normal');
  assert.equal(controller.snapshot().targetCount, 0);
  assert.ok(controller.snapshot().materials.every(material => material.gain === 1 && material.opacity === 1));
  assert.ok(full.visible);
  controller.dispose();
});
