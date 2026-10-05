import test from 'node:test'
import assert from 'node:assert/strict'
import { Group, Vector3, Box3 } from 'three'
import { loadAuditScene } from '../scripts/component-focus-audit.mjs'
import { createUniversalOverlay as createWithManifest, resolveUniversalMap as resolveWithManifest } from '../src/three/universal-maps.mjs'
import { teamModelManifest } from '../src/three/model-manifest.mjs'
import { acquireCar } from '../src/three/car-loader.mjs'

import { readFileSync } from 'node:fs'
const manifest = JSON.parse(readFileSync(new URL('../public/models/F1tech_maps_manifest.json', import.meta.url), 'utf8'))
const createUniversalOverlay = (scene, color) => createWithManifest(scene, color, manifest)
const resolveUniversalMap = (componentId, sourceName) => resolveWithManifest(componentId, sourceName, manifest)
const key = v => [v.x,v.y,v.z].map(value => Math.round(value * 1e4)).join(',')
test('manifest aliases resolve precisely; ambiguous and previously solved parts stay outside overlay', () => {
  for (const [name,map] of Object.entries(manifest.fia_aliases)) assert.equal(resolveUniversalMap(undefined,name),map,name)
  for (const name of ['Floor Leading Edge Devices','Floor Edge Wing','Floor Board']) assert.equal(resolveUniversalMap(undefined,name),'MAP_FLOOR')
  for (const name of ['Bodywork','Front Wing','Rear Wing','Halo','Front Suspension','Cooling','Airbox']) assert.equal(resolveUniversalMap('engineCover',name),null,name)
  assert.equal(resolveUniversalMap('floor'),'MAP_FLOOR')
  assert.equal(resolveUniversalMap(undefined),null)
})

test('real universal overlay aligns with Alpine, McLaren and Ferrari; selection is exclusive and base materials survive', async () => {
  const {scene}=await loadAuditScene('public/models/F1tech_maps.glb')
  const sources=[];scene.traverse(mesh=>{if(mesh.isMesh)sources.push([mesh,mesh.material,mesh.geometry,mesh.visible])})
  const overlay=createUniversalOverlay(scene,'#9de6dc'),wrapper=new Group();wrapper.scale.setScalar(1.1);wrapper.add(overlay.model)
  assert.deepEqual(overlay.snapshot(),{active:null,visible:[]})
  let faces=0;overlay.model.traverse(mesh=>{if(mesh.isMesh)faces+=(mesh.geometry.index?.count??mesh.geometry.attributes.position.count)/3})
  assert.equal(faces,manifest.map_faces_total)
  for(const team of ['alpine','mclaren','ferrari']) {
    const {scene:car}=await loadAuditScene('public'+teamModelManifest[team].path)
    const parent=new Group();parent.scale.setScalar(1.1);parent.add(car);parent.updateMatrixWorld(true);wrapper.updateMatrixWorld(true)
    const originals=[],vertices=new Set(),v=new Vector3()
    car.traverse(mesh=>{if(!mesh.isMesh)return;originals.push([mesh,mesh.material,mesh.geometry]);for(let i=0;i<mesh.geometry.attributes.position.count;i++){v.fromBufferAttribute(mesh.geometry.attributes.position,i).applyMatrix4(mesh.matrixWorld);vertices.add(key(v))}})
    let missing=0,total=0
    overlay.model.traverse(mesh=>{if(!mesh.isMesh)return;for(let i=0;i<mesh.geometry.attributes.position.count;i++){v.fromBufferAttribute(mesh.geometry.attributes.position,i).applyMatrix4(mesh.matrixWorld);total++;if(!vertices.has(key(v)))missing++}})
    assert.equal(missing,0,team+' overlay vertices coincide with the actual car: '+missing+'/'+total)
    for(const name of manifest.maps_exported) {
      overlay.select(name);assert.deepEqual(overlay.snapshot(),{active:name,visible:[name]})
      overlay.model.traverse(mesh=>{if(mesh.isMesh&&mesh.visible){assert.equal(mesh.material.depthWrite,false);assert.equal(mesh.material.polygonOffset,true);assert.equal(mesh.material.map,null)}})
      assert.ok(!new Box3().setFromObject(overlay.model).isEmpty())
      overlay.select(null);assert.deepEqual(overlay.snapshot().visible,[])
    }
    for(const [mesh,material,geometry]of originals){assert.equal(mesh.material,material);assert.equal(mesh.geometry,geometry)}
    parent.remove(car)
  }
  overlay.select('MAP_FLOOR');overlay.select('Bodywork');assert.equal(overlay.snapshot().active,null)
  overlay.dispose()
  for(const [mesh,material,geometry,visible]of sources){assert.equal(mesh.material,material);assert.equal(mesh.geometry,geometry);assert.equal(mesh.visible,visible)}
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
