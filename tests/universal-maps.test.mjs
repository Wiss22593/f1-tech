import test from 'node:test'
import assert from 'node:assert/strict'
import { Matrix4, PerspectiveCamera, Frustum, Vector3 } from 'three'
import { readFileSync } from 'node:fs'
import { loadAuditScene } from '../scripts/component-focus-audit.mjs'
import { normalizeUniversalManifest, resolveUniversalMap as resolveWithManifest, universalInspectionView } from '../src/three/universal-maps.mjs'
import { createComponentIsolation, isolationBrightness } from '../src/three/component-isolation.mjs'
import { teamModelManifest } from '../src/three/model-manifest.mjs'
import { acquireCar } from '../src/three/car-loader.mjs'
const manifest = normalizeUniversalManifest(JSON.parse(readFileSync(new URL('../public/models/F1tech_maps_manifest.json', import.meta.url), 'utf8')))
const resolveUniversalMap = (id, name) => resolveWithManifest(id, name, manifest)
test('manifest aliases resolve precisely; ambiguous and previously solved parts stay outside overlay', () => {
  for (const [name,map] of Object.entries(manifest.fia_aliases)) assert.equal(resolveUniversalMap(undefined,name),map,name)
  for (const name of ['Floor Leading Edge Devices','Floor Edge Wing','Floor Board']) assert.equal(resolveUniversalMap(undefined,name),'MAP_FLOOR')
  for (const name of ['Bodywork','Front Wing','Rear Wing','Halo','Front Suspension','Cooling','Airbox']) assert.equal(resolveUniversalMap('engineCover',name),null,name)
  assert.equal(resolveUniversalMap('floor'),'MAP_FLOOR')
  assert.equal(resolveUniversalMap(undefined),null)
})


test('ten actual masks use the old focus gain, original PBR surfaces and reversible materials on all eleven cars', async () => {
 const {scene:maps}=await loadAuditScene('public/models/F1tech_maps.glb')
 const mapOriginals=[]; maps.traverse(mesh=>{if(mesh.isMesh)mapOriginals.push([mesh,mesh.material,mesh.geometry,mesh.visible])})
 assert.equal(manifest.map_faces_total,160136)
 for(const asset of Object.values(teamModelManifest)) {
  const {scene}=await loadAuditScene('public'+asset.path), originals=[]
  scene.traverse(mesh=>{if(mesh.isMesh) originals.push([mesh,mesh.material,mesh.geometry])})
  const c=createComponentIsolation(scene,asset.assetId,undefined,undefined,{scene:maps,manifest})
  assert.deepEqual(c.snapshot().failures,[],asset.path)
  const materials=[];scene.traverse(mesh=>{if(mesh.isMesh)for(const m of Array.isArray(mesh.material)?mesh.material:[mesh.material])materials.push(m)})
  const ids=c.snapshot().materials.map(m=>m.uuid)
  for(const name of ['frontWing',...Object.keys(manifest.maps),'rearWing']) {
   c.select(name);c.step(.14)
   assert.ok(c.snapshot().materials.some(m=>m.gain>isolationBrightness&&m.gain<1))
   c.step(1);const snapshot=c.snapshot()
   assert.equal(snapshot.active,name);assert.equal(snapshot.mode,'external')
   assert.ok(snapshot.materials.some(m=>m.components.includes(name)&&m.gain===1))
   assert.ok(snapshot.materials.some(m=>!m.components.includes(name)&&m.gain===isolationBrightness))
   assert.ok(snapshot.materials.every(m=>m.focusTint===0&&m.haloContrast===0))
   assert.deepEqual(snapshot.materials.map(m=>m.uuid),ids)
   assert.ok(materials.every(m=>m.isMeshStandardMaterial||m.isMeshPhysicalMaterial))
   if(name.startsWith('MAP_')) {
    let expectedFaces=0;maps.getObjectByName(name).traverse(mesh=>{if(mesh.isMesh)expectedFaces+=(mesh.geometry.index?.count??mesh.geometry.attributes.position.count)/3})
    assert.equal(c.resolveTargets(name).reduce((sum,target)=>sum+target.triangles,0),expectedFaces,name+' exact original surfaces')
   }
   if(name.startsWith('MAP_')) for(const aspect of [1.44,.65]) {
    const matrix=new Matrix4().makeScale(1.1,1.1,1.1),box=c.universalBounds.get(name).clone().applyMatrix4(matrix)
    const view=universalInspectionView(name,c.universalBounds.get(name),matrix,aspect)
    assert.deepEqual(view.target,box.getCenter(new Vector3()).toArray())
    const camera=new PerspectiveCamera(40,aspect,.1,100);camera.position.set(...view.position);camera.lookAt(new Vector3(...view.target));camera.updateMatrixWorld()
    const frustum=new Frustum().setFromProjectionMatrix(new Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse))
    for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])assert.ok(frustum.containsPoint(new Vector3(x,y,z)),asset.path+' '+name+' '+aspect)
    assert.ok(camera.position.distanceTo(new Vector3(...view.target))>=3-1e-8)
   }
   c.select();c.step(1)
   assert.equal(c.snapshot().mode,'normal');assert.ok(c.snapshot().materials.every(m=>m.gain===1&&m.focusTint===0))
  }
  c.select('MAP_ENGINE_COVER');c.step(1);c.dispose()
  for(const [mesh,material,geometry]of originals){assert.equal(mesh.material,material);assert.equal(mesh.geometry,geometry)}
 }
 for(const [mesh,material,geometry,visible]of mapOriginals){assert.equal(mesh.material,material);assert.equal(mesh.geometry,geometry);assert.equal(mesh.visible,visible)}
})
test('car cache reuses active leases, releases GPU resources, and evicts abandoned late loads',async()=>{
  const {scene}=await loadAuditScene('public/models/F1tech_maps.glb')
  let loads=0,disposed=0;const unique=new Set();scene.traverse(mesh=>{if(mesh.isMesh)unique.add(mesh.geometry)});for(const geometry of unique)geometry.addEventListener('dispose',()=>disposed++)
  const load=async()=>{loads++;return {scene}}
  const a=acquireCar('cache-test',load),b=acquireCar('cache-test',load)
  assert.equal(await a.ready,await b.ready);assert.equal(loads,1)
  a.release();await new Promise(r=>setTimeout(r,5));assert.equal(disposed,0)
  b.release();await new Promise(r=>setTimeout(r,5));assert.equal(disposed,unique.size)
  let finish;const pending=acquireCar('abandoned',()=>new Promise(resolve=>{finish=resolve}))
  await Promise.resolve();pending.release();finish({scene});await pending.ready;await new Promise(r=>setTimeout(r,5));assert.equal(disposed,unique.size*2)
})
