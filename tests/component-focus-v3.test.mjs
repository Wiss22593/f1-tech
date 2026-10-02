import test from 'node:test'
import assert from 'node:assert/strict'
import { BufferAttribute, BufferGeometry, Group, Mesh, MeshStandardMaterial, Scene } from 'three'
import { cachedGeometryParts, connectedTriangleParts, normalizeComponentId, resolveInspectionComponent } from '../src/three/component-mapping.mjs'
import { createComponentIsolation } from '../src/three/component-isolation.mjs'
import { loadAuditScene } from '../scripts/component-focus-audit.mjs'
const geometry = () => new BufferGeometry().setAttribute('position', new BufferAttribute(Float32Array.from([0,0,0,1,0,0,0,1,0, 3,0,0,4,0,0,3,1,0]),3)).setIndex([0,1,2,3,4,5])
function fixture() { const scene=new Scene(),mesh=new Mesh(geometry(),new MeshStandardMaterial({color:0x1255aa}));mesh.name='Part';scene.add(mesh);return{scene,mesh} }
const controller = (scene,map) => createComponentIsolation(scene,'fixture',undefined,map)
test('direct nested Object3D and multi-mesh matching resolve every child; ambiguous names fail closed',()=>{
 const scene=new Scene(),assembly=new Group();assembly.name='Halo_Assembly';scene.add(assembly);assembly.add(new Mesh(geometry(),new MeshStandardMaterial()),new Mesh(geometry(),new MeshStandardMaterial()))
 const c=controller(scene,{objects:{halo:['halo assembly']}});assert.equal(c.resolveTargets('halo').length,2);assert.ok(c.resolveTargets('halo').every(t=>t.type==='mesh'));c.select('HALO');c.step(1);assert.equal(c.snapshot().targetCount,2);c.dispose()
 const duplicate=assembly.clone();scene.add(duplicate);const invalid=controller(scene,{objects:{halo:['Halo_Assembly']}});assert.equal(invalid.resolveTargets('halo').length,0);invalid.select('halo');invalid.step(1);assert.ok(invalid.snapshot().materials.every(m=>m.gain===1));invalid.dispose()
})
test('real material groups preserve the complete draw and source references',()=>{
 const {scene,mesh}=fixture(),source=[mesh.material,new MeshStandardMaterial({color:0xee1155})],original=mesh.geometry;mesh.material=source;mesh.geometry.addGroup(0,3,0);mesh.geometry.addGroup(3,3,1)
 const c=controller(scene,{meshRules:[{node:'Part',primitive:0,partition:'groups',components:{halo:[{groupIndex:1,triangles:1}]}}]});assert.equal(c.resolveTargets('halo')[0].type,'group');c.select('halo');c.step(1);assert.deepEqual(c.snapshot().materials.map(m=>m.gain),[.28,1]);assert.equal(mesh.geometry.index.count,6);c.dispose();assert.equal(mesh.material,source);assert.equal(mesh.geometry,original)
})
test('overlapping geometry groups are rejected, never double-rendered',()=>{
 const {scene,mesh}=fixture();mesh.material=[mesh.material,mesh.material.clone()];mesh.geometry.addGroup(0,6,0);mesh.geometry.addGroup(3,3,1)
 const c=controller(scene,{meshRules:[{node:'Part',partition:'groups',components:{halo:[{groupIndex:1}]}}]});assert.equal(c.resolveTargets('halo').length,0);c.select('halo');c.step(1);assert.ok(c.snapshot().materials.every(m=>m.gain===1));c.dispose()
})
test('indexed islands preserve authored boundaries even when coincident vertices touch',()=>{
 const pos=Float32Array.from([0,0,0,1,0,0,0,1,0,0,0,0,-1,0,0,0,-1,0]),index=Uint16Array.from([0,1,2,3,4,5]);assert.equal(connectedTriangleParts(pos,index,null).length,2);assert.equal(connectedTriangleParts(pos,index,1e6).length,1)
})
test('whole indexed islands activate only with real targets; unknown selection restores everything',()=>{
 const {scene,mesh}=fixture(),original=mesh.geometry;const c=controller(scene,{meshRules:[{node:'Part',partition:'indexed',components:{frontWing:[{firstTriangle:0,triangles:1}]}}]});assert.equal(c.resolveTargets('front-wing').length,1);c.select('Front_Wing');c.step(1);assert.equal(c.snapshot().active,'frontWing');assert.equal(c.snapshot().targetCount,1);assert.ok(c.snapshot().materials.some(m=>m.gain===.28));assert.deepEqual([...mesh.geometry.index.array],[0,1,2,3,4,5]);c.select('unknown');c.step(1);assert.equal(c.snapshot().targetCount,0);assert.ok(c.snapshot().materials.every(m=>m.gain===1));c.dispose();assert.equal(mesh.geometry,original)
})
test('unindexed complete triangles receive a private index and restore without source mutation',()=>{
 const {scene,mesh}=fixture();mesh.geometry.setIndex(null);const original=mesh.geometry; {
  const c=controller(scene,{meshRules:[{node:'Part',partition:'indexed',components:{halo:[{firstTriangle:1,triangles:1}]}}]});assert.equal(c.resolveTargets('halo').length,1);assert.equal(mesh.geometry.index.count,6);c.dispose();assert.equal(mesh.geometry,original);assert.equal(mesh.geometry.index,null)
 }
})
test('component spellings and sensible FIA aliases are centralized; corner and drum remain distinct',()=>{
 for(const s of ['front-wing','front_wing','Front Wing','frontWing'])assert.equal(normalizeComponentId(s),'frontWing')
 for(const s of ['Floor','Floor Edge','Floor Body','Floor Fences'])assert.equal(normalizeComponentId(s),'floor')
 assert.equal(normalizeComponentId('Front Corner'),'frontCorner');assert.equal(normalizeComponentId('Rear Corner'),'rearCorner');assert.equal(normalizeComponentId('Front Drum'),null)
 assert.equal(resolveInspectionComponent('frontSuspension','Front Drum'),null);assert.equal(resolveInspectionComponent('engineCover','Airbox'),null);assert.equal(resolveInspectionComponent(undefined,'Rear Corner'),'rearCorner');assert.equal(resolveInspectionComponent(undefined,'Mirrors'),'mirrors');assert.equal(resolveInspectionComponent(undefined,'Beam Wing'),null)
})
test('topology cache reuses identical GLTF geometry, separates assets and invalidates modified input',()=>{
 const g=geometry();const a=cachedGeometryParts(g,'asset-a',null),b=cachedGeometryParts(g,'asset-a',null);assert.equal(a.cacheHit,false);assert.equal(b.cacheHit,true);assert.equal(a.parts,b.parts);assert.equal(cachedGeometryParts(g,'asset-b',null).cacheHit,false);g.attributes.position.array[0]+=1;assert.equal(cachedGeometryParts(g,'asset-a',null).cacheHit,false)
})
test('overlapping semantic assemblies share surfaces without duplicated triangles; incomplete compound fails',()=>{
 const {scene,mesh}=fixture();const original=mesh.geometry;const map={meshRules:[{node:'Part',partition:'indexed',components:{floor:[{firstTriangle:0,triangles:1},{firstTriangle:1,triangles:1}],diffuser:[{firstTriangle:1,triangles:1}]}}],composites:{rearCorner:['floor','diffuser']}}
 const c=controller(scene,map);assert.equal(c.resolveTargets('diffuser').length,1);assert.equal(c.resolveTargets('rearCorner').length,2);c.select('diffuser');c.step(1);assert.deepEqual(c.snapshot().materials.map(m=>m.gain),[.28,1]);assert.equal(mesh.geometry.index.count,original.index.count);c.dispose()
 const incomplete=controller(scene,{...map,composites:{rearCorner:['floor','unmapped']}});assert.equal(incomplete.resolveTargets('rearCorner').length,0);incomplete.select('rearCorner');incomplete.step(1);assert.ok(incomplete.snapshot().materials.every(m=>m.gain===1));incomplete.dispose()
})
for(const [asset,file]of [['bgrt-f1-concept-2026-evaluation','bgrt-f1-concept-2026.glb'],['alpine-a526-formulatech-evaluation','alpine-a526-formulatech.glb']])test(`${asset}: real GLTF hierarchy, every expanded target and material restoration`,async()=>{
 const {scene}=await loadAuditScene('public/models/'+file),sources=[];scene.traverse(m=>{if(m.isMesh)sources.push([m,m.material,m.geometry])});let c=createComponentIsolation(scene,asset)
 for(const component of c.highlightable){assert.ok(c.resolveTargets(component).length>0,component);c.select(component);c.step(1);const s=c.snapshot();assert.equal(s.active,component);assert.ok(s.materials.some(m=>m.gain===1&&m.components.includes(component)));assert.ok(s.materials.every(m=>m.gain===(m.components.includes(component)?1:.28)))}
 for(const component of (asset.startsWith('alpine')?['floor','nose','frontBrake','rearBrake','airbox','frontDrum','beamWing','steeringWheel']:['cooling','airbox','frontDrum','beamWing','steeringWheel'])){c.select(component);c.step(1);assert.equal(c.snapshot().active,null);assert.ok(c.snapshot().materials.every(m=>m.gain===1))}
 c.dispose();for(const[m,material,geo]of sources){assert.equal(m.material,material);assert.equal(m.geometry,geo)}
 c=createComponentIsolation(scene,asset);assert.ok(c.snapshot().cache.hits>=2);assert.equal(c.snapshot().cache.misses,0);c.dispose()
})
