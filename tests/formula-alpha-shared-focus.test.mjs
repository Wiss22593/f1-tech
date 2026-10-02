import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { Box3, Frustum, Matrix4, PerspectiveCamera, Vector3 } from 'three'
import { teamModelManifest } from '../src/three/model-manifest.mjs'
import { componentMeshMappings, geometryArrayHash } from '../src/three/component-mapping.mjs'
import { alpineInspectionViews, isFormulaAlphaAsset, resolveAlpineFocus } from '../src/three/alpine-focus.mjs'
import { loadAuditScene } from '../scripts/component-focus-audit.mjs'
import { createComponentIsolation } from '../src/three/component-isolation.mjs'

test('all eleven actual GLBs share geometry, validated targets, cameras and reversible private materials', async () => {
 let expectedSignature
 const expected=['chassis','halo','frontWing','rearWing','frontSuspension','rearSuspension','cooling','mirrors','frontWheels','rearWheels','frontCorner','rearCorner','wheels'].sort()
 for(const asset of Object.values(teamModelManifest)) {
  assert.ok(isFormulaAlphaAsset(asset.assetId))
  assert.equal(componentMeshMappings[asset.assetId],componentMeshMappings[teamModelManifest.alpine.assetId])
  const {scene}=await loadAuditScene('public'+asset.path),original=[],inventory=[]
  scene.traverse(mesh=>{if(!mesh.isMesh)return;original.push([mesh,mesh.material,mesh.geometry]);inventory.push([mesh.name,mesh.parent?.name,mesh.matrixWorld.toArray(),geometryArrayHash(mesh.geometry.attributes.position.array),geometryArrayHash(mesh.geometry.index.array)])})
  const signature=createHash('sha256').update(JSON.stringify(inventory)).digest('hex')
  expectedSignature??=signature;assert.equal(signature,expectedSignature,asset.path)
  const c=createComponentIsolation(scene,asset.assetId)
  assert.deepEqual(c.snapshot().failures,[],asset.path);assert.deepEqual([...c.highlightable].sort(),expected)
  const owned=new Set();scene.traverse(mesh=>{if(mesh.isMesh)for(const m of Array.isArray(mesh.material)?mesh.material:[mesh.material])owned.add(m)})
  const disposals=new Map([...owned].map(m=>[m,0]));for(const m of owned)m.addEventListener('dispose',()=>disposals.set(m,disposals.get(m)+1))
  const ids=c.snapshot().materials.map(m=>m.uuid)
  for(const component of c.highlightable) {
   const view=alpineInspectionViews[component];assert.ok(view)
   assert.equal(resolveAlpineFocus(component,undefined,c.highlightable),component)
   const camera=new PerspectiveCamera(40,1.44,.1,100);camera.position.set(...view.position);camera.lookAt(new Vector3(...view.target));camera.updateMatrixWorld()
   const frustum=new Frustum().setFromProjectionMatrix(new Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse)),box=new Box3()
   for(const target of c.resolveTargets(component))box.union(new Box3().setFromObject(scene.getObjectByName(target.meshName)))
   box.min.multiplyScalar(1.1);box.max.multiplyScalar(1.1)
   for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])assert.ok(frustum.containsPoint(new Vector3(x,y,z)),asset.path+' '+component)
   c.select(component);c.step(1)
  }
  for(const name of ['Nose','Floor','Diffuser','Sidepods','Engine Cover','Airbox','Front Brake','Rear Brake']) {
   assert.equal(resolveAlpineFocus(undefined,name,c.highlightable),undefined)
   c.select(resolveAlpineFocus(undefined,name,c.highlightable));c.step(1)
   assert.equal(c.snapshot().mode,'normal');assert.ok(c.snapshot().materials.every(m=>m.gain===1&&m.focusTint===0))
  }
  assert.deepEqual(c.snapshot().materials.map(m=>m.uuid),ids)
  c.dispose();c.dispose()
  for(const count of disposals.values())assert.equal(count,1)
  for(const [mesh,material,geometry]of original){assert.equal(mesh.material,material);assert.equal(mesh.geometry,geometry)}
 }
 assert.equal(isFormulaAlphaAsset('unknown'),false)
 assert.equal(isFormulaAlphaAsset('bgrt-f1-concept-2026-evaluation'),false)
})

test('a changed non-Alpine target fails closed without disabling other pieces',async()=>{
 const asset=teamModelManifest.ferrari,{scene}=await loadAuditScene('public'+asset.path)
 const mesh=scene.getObjectByName('GEO_MAIN_REARWING_453');mesh.geometry=mesh.geometry.clone();mesh.geometry.attributes.position.array[0]+=.01
 const c=createComponentIsolation(scene,asset.assetId)
 assert.equal(c.resolveTargets('rearWing').length,0);assert.ok(c.highlightable.includes('frontWing'))
 c.select('rearWing');c.step(1);assert.equal(c.snapshot().mode,'normal');c.dispose()
})
