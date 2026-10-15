import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createHash } from 'node:crypto'
import { loadAuditScene } from '../scripts/component-focus-audit.mjs'
import { componentMeshMappings } from '../src/three/component-mapping.mjs'
import { createComponentIsolation } from '../src/three/component-isolation.mjs'
const id='alpine-a526-formulatech-evaluation'
test('Alpine mapping resolves every named mesh with current GLB integrity and real occluded radiator',async()=>{
 const map=componentMeshMappings[id],bytes=fs.readFileSync('public/models/'+map.file)
 assert.equal(createHash('sha256').update(bytes).digest('hex'),map.sha256)
 const {scene}=await loadAuditScene('public/models/'+map.file)
 for(const names of Object.values(map.objects)) for(const name of names) assert.ok(scene.getObjectByName(name)?.isMesh,name)
 const audit=JSON.parse(fs.readFileSync('docs/alpine-v2-inventory.json'))
 assert.equal(audit.sha256,map.sha256)
 assert.ok(audit.inventory.flatMap(row=>row.islands??[]).some(part=>part.components.includes('cooling')&&part.occlusion.blockedByGeometry>0))
 const c=createComponentIsolation(scene,id); assert.deepEqual(c.snapshot().failures,[])
 const originals=[];scene.traverse(mesh=>{if(mesh.isMesh) originals.push({mesh,order:mesh.renderOrder,materials:(Array.isArray(mesh.material)?mesh.material:[mesh.material]).map(m=>({m,opacity:m.opacity,transparent:m.transparent,depthWrite:m.depthWrite,depthTest:m.depthTest}))})})
 for(let i=0;i<3;i++){
 c.select('cooling');c.step(1);assert.equal(c.snapshot().mode,'internal')
 for(const channel of c.snapshot().materials){const target=channel.components.includes('cooling');assert.equal(channel.opacity,target?1:.1);assert.equal(channel.depthWrite,false);assert.equal(channel.depthTest,!target)}
 for(const next of ['frontWing',undefined,'nose']){
 c.select(next);c.step(1)
 for(const {mesh,order,materials} of originals){assert.equal(mesh.renderOrder,order);for(const {m,...base} of materials) for(const [key,value] of Object.entries(base))assert.equal(m[key],value)}
 }
 }
 c.dispose()
})
test('changed Alpine object geometry fails closed without camera-eligible targets',async()=>{
 const {scene}=await loadAuditScene('public/models/'+componentMeshMappings[id].file)
 const mesh=scene.getObjectByName(componentMeshMappings[id].objects.cooling[0])
 mesh.geometry=mesh.geometry.clone();mesh.geometry.attributes.position.array[0]+=.01
 const c=createComponentIsolation(scene,id);assert.equal(c.resolveTargets('cooling').length,0)
 c.select('cooling');c.step(1);assert.equal(c.snapshot().mode,'normal');assert.ok(c.snapshot().materials.every(m=>m.gain===1));c.dispose()
})
