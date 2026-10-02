import test from 'node:test'
import assert from 'node:assert/strict'
import { BufferAttribute, BufferGeometry, Mesh, MeshPhysicalMaterial, MeshStandardMaterial, Scene, Texture } from 'three'
import { createComponentIsolation } from '../src/three/component-isolation.mjs'
import { loadAuditScene } from '../scripts/component-focus-audit.mjs'

const parameters = material => ({
  type: material.type, color: material.color.toArray(), roughness: material.roughness,
  metalness: material.metalness, emissive: material.emissive.toArray(),
  emissiveIntensity: material.emissiveIntensity, opacity: material.opacity,
  transparent: material.transparent, clearcoat: material.clearcoat,
  clearcoatRoughness: material.clearcoatRoughness, ior: material.ior,
  envMapIntensity: material.envMapIntensity, specularIntensity: material.specularIntensity,
  specularColor: material.specularColor?.toArray(),
  maps: ['map', 'roughnessMap', 'normalMap', 'clearcoatMap', 'clearcoatRoughnessMap', 'clearcoatNormalMap'].map(key => material[key]),
})
const materials = scene => {
  const result = []
  scene.traverse(node => { if (node.isMesh) result.push(...(Array.isArray(node.material) ? node.material : [node.material])) })
  return result
}

for (const Type of [MeshStandardMaterial, MeshPhysicalMaterial]) {
  test(`${Type.name}: shared source material isolates meshes independently and preserves PBR`, () => {
    const scene = new Scene(), source = new Type({ color: '#013c99', roughness: 0.15, metalness: 0.2 })
    if (source.isMeshPhysicalMaterial) {
      source.clearcoat = 0.65; source.clearcoatRoughness = 0.06; source.ior = 1.45
      source.clearcoatMap = new Texture(); source.clearcoatNormalMap = new Texture()
    }
    source.map = new Texture()
    const before = parameters(source), geometry = new BufferGeometry()
      .setAttribute('position', new BufferAttribute(Float32Array.from([0, 0, 0, 1, 0, 0, 0, 1, 0]), 3)).setIndex([0, 1, 2])
    const a = new Mesh(geometry, source), b = new Mesh(geometry, source)
    a.name = 'A'; b.name = 'B'; scene.add(a, b)
    const controller = createComponentIsolation(scene, 'shared-fixture', undefined, { objects: { halo: ['A'], nose: ['B'] } })
    assert.notEqual(a.material, b.material); assert.notEqual(a.material, source)
    const uniform = material => {
      const shader = { uniforms: {}, fragmentShader: '#include <common>\n#include <dithering_fragment>' }
      material.onBeforeCompile(shader, {})
      assert.match(shader.fragmentShader, /gl_FragColor\.rgb \*= f1TechIsolationGain/)
      return shader.uniforms.f1TechIsolationGain
    }
    const ua = uniform(a.material), ub = uniform(b.material)
    controller.select('halo'); controller.step(1); assert.equal(ua.value, 1); assert.equal(ub.value, 0.28)
    controller.select('nose'); controller.step(1); assert.equal(ua.value, 0.28); assert.equal(ub.value, 1)
    for (const selection of [undefined, 'missing']) {
      controller.select(selection); controller.step(1); assert.equal(ua.value, 1); assert.equal(ub.value, 1)
    }
    for (const material of [source, a.material, b.material]) assert.deepEqual(parameters(material), before)
    controller.dispose(); assert.equal(a.material, source); assert.equal(b.material, source)
    assert.equal(a.geometry, geometry); assert.equal(b.geometry, geometry)
  })
}

test('actual Alpine V2 keeps Physical paint/clearcoat and Standard carbon through every component transition', async () => {
  const { scene } = await loadAuditScene('public/models/alpine-a526-formulatech.glb')
  const source = new Map(materials(scene).map(material => [material.name, parameters(material)]))
  assert.ok(source.size > 0)
  const controller = createComponentIsolation(scene, 'alpine-a526-formulatech-evaluation')
  const initial = controller.snapshot(), privateMaterials = materials(scene)
  assert.deepEqual(initial.failures, [])
  for (const component of controller.highlightable) {
    assert.ok(controller.resolveTargets(component).length > 0, component)
    controller.select(component); controller.step(1)
    for (const channel of controller.snapshot().materials) assert.equal(channel.gain, channel.components.includes(component) ? 1 : 0.28)
    for (const material of privateMaterials) {
      const actual = parameters(material), expected = { ...source.get(material.name) }
      if (controller.snapshot().mode === 'internal') {
        delete actual.opacity; delete actual.transparent
        delete expected.opacity; delete expected.transparent
      }
      assert.deepEqual(actual, expected)
    }
  }
  controller.select(undefined); controller.step(1)
  assert.ok(controller.snapshot().materials.every(material => material.gain === 1))
  assert.deepEqual(controller.snapshot().materials.map(material => material.uuid), initial.materials.map(material => material.uuid))
  controller.dispose()
  for (const material of materials(scene)) assert.deepEqual(parameters(material), source.get(material.name))
})
