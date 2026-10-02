import test from 'node:test'
import assert from 'node:assert/strict'
import { Box3, Frustum, Matrix4, PerspectiveCamera, Vector3 } from 'three'
import { loadAuditScene } from '../scripts/component-focus-audit.mjs'
import { createComponentIsolation } from '../src/three/component-isolation.mjs'
import { alpineAssetId, alpineInspectionViews, resolveAlpineFocus } from '../src/three/alpine-focus.mjs'
import { resolveInspectionComponent } from '../src/three/component-mapping.mjs'

const file='public/models/alpine-a526-formulatech.glb'
test('Alpine: every eligible component has a standalone camera that encloses its real targets', async () => {
 const {scene}=await loadAuditScene(file), c=createComponentIsolation(scene,alpineAssetId)
 for(const component of c.highlightable) {
  assert.equal(resolveAlpineFocus(component,undefined,c.highlightable),component)
  const view=alpineInspectionViews[component]; assert.ok(view,component)
  const camera=new PerspectiveCamera(40,1440/1000,.1,100)
  camera.position.set(...view.position);camera.lookAt(new Vector3(...view.target));camera.updateMatrixWorld()
  const frustum=new Frustum().setFromProjectionMatrix(new Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse))
  const box=new Box3()
  for(const target of c.resolveTargets(component)) box.union(new Box3().setFromObject(scene.getObjectByName(target.meshName)))
  box.min.multiplyScalar(1.1);box.max.multiplyScalar(1.1)
  for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]) assert.ok(frustum.containsPoint(new Vector3(x,y,z)),component+' target outside camera')
 }
 const rear=alpineInspectionViews.rearSuspension
 assert.ok(rear.position[2]<rear.target[2] && rear.position[1]>rear.target[1]+2)
 c.dispose()
})
test('Alpine: unsupported FIA names never borrow a mapped camera or darken the car', async () => {
 const {scene}=await loadAuditScene(file),c=createComponentIsolation(scene,alpineAssetId)
 const baseline=c.snapshot().materials
 for(const [id,name] of [['nose','Nose'],['floor','Floor'],['sidepods','Sidepod'],['engineCover','Engine Cover'],['engineCover','Airbox'],['frontBrake','Front Brake'],['rearBrake','Rear Brake'],['frontSuspension','Front Drum'],['rearWing','Beam Wing'],['cooling','Cooling Louvres'],['diffuser','Diffuser'],['steeringWheel','Steering Wheel'],['onboardCamera','Onboard Camera']]) {
  c.select('cooling');c.step(1)
  assert.equal(resolveAlpineFocus(id,name,c.highlightable),undefined,name)
  c.select(resolveInspectionComponent(id,name));c.step(1)
  assert.equal(c.snapshot().mode,'normal',name)
  assert.ok(c.snapshot().materials.every(m=>m.focusTint===0),name)
  assert.ok(c.snapshot().materials.every((m,i)=>m.gain===1 && m.opacity===baseline[i].opacity && m.transparent===baseline[i].transparent && m.depthWrite===baseline[i].depthWrite && m.depthTest===baseline[i].depthTest),name)
 }
 c.dispose()
})
test('Alpine: private semantic material pooling preserves originals, disposes once and allocates nothing on selection',async()=>{
 const {scene}=await loadAuditScene(file),original=[]
 scene.traverse(mesh=>{if(mesh.isMesh)original.push([mesh,mesh.material,mesh.geometry])})
 for(let cycle=0;cycle<4;cycle++){
  const c=createComponentIsolation(scene,alpineAssetId),owned=new Set()
  scene.traverse(mesh=>{if(mesh.isMesh)for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material])owned.add(material)})
  assert.ok(owned.size<original.length/2)
  const versions=new Map([...owned].map(m=>[m,m.version])),ids=c.snapshot().materials.map(m=>m.uuid)
  const disposals=new Map([...owned].map(m=>[m,0]))
  for(const m of owned)m.addEventListener('dispose',()=>disposals.set(m,disposals.get(m)+1))
  for(const component of ['frontWing','rearSuspension','frontSuspension',undefined]){
   c.select(component);c.step(1)
   assert.ok(c.snapshot().materials.every(m=>m.focusTint===(component && m.components.includes(component) ? .22 : 0)))
   assert.deepEqual(c.snapshot().materials.map(m=>m.uuid),ids)
   for(const m of owned)assert.equal(m.version,versions.get(m),'external focus recompiles shader')
  }
  for(const component of ['cooling','halo',undefined]){c.select(component);c.step(1)}
  c.dispose();c.dispose()
  for(const count of disposals.values())assert.equal(count,1)
  for(const [mesh,material,geometry]of original){assert.equal(mesh.material,material);assert.equal(mesh.geometry,geometry)}
 }
})
