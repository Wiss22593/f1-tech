import test from 'node:test'
import assert from 'node:assert/strict'
import { Texture, SRGBColorSpace } from 'three'
import { loadAuditScene } from '../scripts/component-focus-audit.mjs'
import { createComponentIsolation } from '../src/three/component-isolation.mjs'
import { assertAuthoredTextures, boundedTextureSize } from '../src/three/authored-livery.mjs'

const id = 'alpine-a526-formulatech-evaluation'
const fields = ['map','normalMap','roughnessMap','metalnessMap','emissiveMap','roughness','metalness','opacity','transparent','depthWrite','depthTest','side','alphaTest','toneMapped','blending','dithering']
const state = material => Object.fromEntries([...fields.map(key => [key,material[key]]), ['color',material.color.toArray()], ['emissive',material.emissive.toArray()]])

test('9216px authored atlas is bounded proportionally; small textures remain unchanged', () => {
  assert.deepEqual(boundedTextureSize(9216,3072), [4096,1365])
  assert.deepEqual(boundedTextureSize(512,256), [512,256])
  assert.deepEqual(boundedTextureSize(1024,4096,2048), [512,2048])
})

test('failed authored image decoding cannot be accepted as a successful white GLTF', async () => {
  const {scene,gltf} = await loadAuditScene('public/models/alpine-a526-formulatech.glb')
  const associations = new Map()
  scene.traverse(mesh => { if(mesh.isMesh) for(const m of Array.isArray(mesh.material)?mesh.material:[mesh.material]) associations.set(m,{materials:gltf.materials.findIndex(def=>def.name===m.name)}) })
  const result = {scene,parser:{json:gltf,associations}}
  assert.throws(()=>assertAuthoredTextures(result),/Authored livery texture missing/)
  scene.traverse(mesh => { if(mesh.isMesh) for(const m of Array.isArray(mesh.material)?mesh.material:[mesh.material]) m.map = new Texture() })
  assert.doesNotThrow(()=>assertAuthoredTextures(result))
})

test('Alpine texture channels and every base material survive focus, GP cleanup, remount and reload cycles', async () => {
  const {scene,gltf} = await loadAuditScene('public/models/alpine-a526-formulatech.glb')
  const materials = new Set()
  scene.traverse(mesh => { if(mesh.isMesh) for(const m of Array.isArray(mesh.material)?mesh.material:[mesh.material]) materials.add(m) })
  // CPU geometry audit omits image decoding. Supply real authored channel and
  // color-space metadata; browser regression independently decodes the PNGs.
  for(const m of materials) {
    const def = gltf.materials.find(def=>def.name===m.name)
    m.map = new Texture(); m.map.channel = def.pbrMetallicRoughness.baseColorTexture.texCoord ?? 0
    m.map.colorSpace = SRGBColorSpace
  }
  const bases = new Map([...materials].map(m=>[m,state(m)]))
  let textureDisposals=0
  for(const m of materials) m.map.addEventListener('dispose',()=>textureDisposals++)
  for(let gp=0;gp<6;gp++) {
    const model=scene.clone(true), original=[]
    model.traverse(mesh=>{if(mesh.isMesh)original.push([mesh,mesh.material,mesh.geometry,mesh.renderOrder])})
    for(let mount=0;mount<2;mount++) {
      const c=createComponentIsolation(model,id)
      for(const component of [...c.highlightable,'cooling',undefined,'unknown']) {
        c.select(component);c.step(1)
        for(const [m,base] of bases) assert.deepEqual(state(m),base)
        model.traverse(mesh=>{if(mesh.isMesh)for(const m of Array.isArray(mesh.material)?mesh.material:[mesh.material]) {
          assert.ok(m.map);assert.ok(!materials.has(m));assert.equal(m.map.channel,gltf.materials.find(def=>def.name===m.name).pbrMetallicRoughness.baseColorTexture.texCoord??0)
        }})
      }
      c.select(undefined);c.step(1)
      model.traverse(mesh=>{if(mesh.isMesh)for(const m of Array.isArray(mesh.material)?mesh.material:[mesh.material]) assert.deepEqual(state(m),bases.get([...materials].find(base=>base.name===m.name)))})
      c.dispose();c.dispose()
      for(const [mesh,material,geometry,order] of original){assert.equal(mesh.material,material);assert.equal(mesh.geometry,geometry);assert.equal(mesh.renderOrder,order)}
    }
  }
  assert.equal(textureDisposals,0)
})
