import test from 'node:test'
import assert from 'node:assert/strict'
import { loadAuditScene } from '../scripts/component-focus-audit.mjs'
import { createComponentIsolation } from '../src/three/component-isolation.mjs'
import { componentMeshMappings } from '../src/three/component-mapping.mjs'
const id = 'alpine-a526-formulatech-evaluation'
test('Alpine halo includes full ring and fittings but excludes mirror and cockpit islands', async () => {
 const { scene } = await loadAuditScene('public/models/alpine-a526-formulatech.glb')
 const mesh = scene.getObjectByName('GEO_MAIN_BODY_3_366'), geometry = mesh.geometry, material = mesh.material
 const originalFaces = Array.from(geometry.index.array)
 const c = createComponentIsolation(scene, id)
 assert.deepEqual(c.snapshot().failures, [])
 const islands = c.resolveTargets('halo').filter(t => t.meshName === mesh.name)
 assert.deepEqual(islands.map(t => [t.firstTriangle,t.triangles]), [[0,3954],[33,3688],[77,247],[16605,247],[3779,228],[20307,228]])
 assert.equal(c.resolveTargets('halo').length, 13)
 assert.deepEqual(c.resolveTargets('halo').filter(t=>t.meshName==='GEO_MAIN_STICKERS_368').map(t=>[t.firstTriangle,t.triangles]),[[2398,3502],[6642,575],[16423,575]])
 // Repartitioning preserves every original indexed triangle, including winding.
 const faces = a => Array.from({length:a.length/3},(_,i)=>a.slice(i*3,i*3+3).join(',')).sort()
 assert.deepEqual(faces(Array.from(mesh.geometry.index.array)),faces(originalFaces))
 c.select('halo');c.step(1)
 assert.ok(c.snapshot().materials.filter(m=>m.components.includes('halo')).every(m=>m.gain===1 && m.haloContrast>0))
 assert.ok(c.snapshot().materials.filter(m=>!m.components.includes('halo')).every(m=>m.haloContrast===0))
 assert.ok(c.snapshot().materials.some(m => !m.components.includes('halo') && m.gain === .28))
 c.select(undefined);c.step(1)
 assert.ok(c.snapshot().materials.every(m => m.gain === 1 && m.focusTint === 0 && m.haloContrast === 0))
 c.dispose();assert.equal(mesh.geometry,geometry);assert.equal(mesh.material,material)
})
test('Alpine halo fails closed when the mixed BODY mesh fingerprint changes', async () => {
 const {scene} = await loadAuditScene('public/models/alpine-a526-formulatech.glb')
 const map = structuredClone(componentMeshMappings[id]);map.meshRules[0].positionHash = 'invalid'
 const c = createComponentIsolation(scene,id,undefined,map)
 assert.ok(!c.highlightable.includes('halo'))
 c.select('halo');c.step(1);assert.equal(c.snapshot().mode,'normal')
 assert.ok(c.snapshot().materials.every(m=>m.gain===1 && m.focusTint===0));c.dispose()
})
