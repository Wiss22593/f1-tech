import fs from 'node:fs';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Vector3 } from 'three';
import { connectedTriangleParts } from '../src/three/component-mapping.mjs';
globalThis.ProgressEvent ??= class ProgressEvent { constructor(type, props) { this.type=type;Object.assign(this,props) } };
export async function loadAuditScene(file) {
 const bytes=fs.readFileSync(file),length=bytes.readUInt32LE(12),gltf=JSON.parse(bytes.subarray(20,20+length)),binary=bytes.subarray(28+length);
 const spec=structuredClone(gltf);spec.buffers[0].uri='data:application/octet-stream;base64,'+binary.toString('base64');
 // Geometry/hierarchy are parsed by the real GLTFLoader; CPU audit omits image decoding only.
 for(const m of spec.materials??[]){for(const key of Object.keys(m))if(key.endsWith('Texture'))delete m[key];for(const key of Object.keys(m.pbrMetallicRoughness??{}))if(key.endsWith('Texture'))delete m.pbrMetallicRoughness[key]}
 const {scene}=await new GLTFLoader().parseAsync(JSON.stringify(spec),'');scene.updateMatrixWorld(true);return{scene,gltf,bytes};
}
export function indexedParts(position,index) {
 const p=Int32Array.from({length:position.length/3},(_,i)=>i),find=x=>{while(p[x]!==x){p[x]=p[p[x]];x=p[x]}return x},union=(a,b)=>{a=find(a);b=find(b);if(a!==b)p[b]=a};
 for(let i=0;i<index.length;i+=3){union(index[i],index[i+1]);union(index[i],index[i+2])}
 const parts=new Map();for(let i=0;i<index.length;i+=3){const r=find(index[i]);if(!parts.has(r))parts.set(r,{firstTriangle:i/3,indices:[]});parts.get(r).indices.push(index[i],index[i+1],index[i+2])}return [...parts.values()];
}
const bounds=(part,mesh)=>{const p=mesh.geometry.attributes.position;const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity],v=new Vector3();for(const i of new Set(part.indices)){v.fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld);for(let j=0;j<3;j++){min[j]=Math.min(min[j],v.getComponent(j));max[j]=Math.max(max[j],v.getComponent(j))}}return{min:min.map(x=>+x.toFixed(5)),max:max.map(x=>+x.toFixed(5))}};
if(process.argv[1]?.endsWith('component-focus-audit.mjs'))for(const file of ['bgrt-f1-concept-2026.glb','alpine-a526-formulatech.glb']){
 const{scene,gltf}=await loadAuditScene('public/models/'+file),inventory=[];scene.traverse(o=>{const row={type:o.type,name:o.name,path:[],children:o.children.map(c=>c.name),matrix:o.matrixWorld.elements};for(let p=o;p;p=p.parent)row.path.unshift(p.name||p.type);if(o.isMesh){const geo=o.geometry;row.vertices=geo.attributes.position.count;row.triangles=(geo.index?.count??row.vertices)/3;row.materials=(Array.isArray(o.material)?o.material:[o.material]).map(m=>m.name);row.groups=geo.groups;const index=geo.index?.array??Uint32Array.from({length:row.vertices},(_,i)=>i);row.bounds=bounds({indices:[...index]},o);row.partitions={};for(const mode of ['indexed','weld1e6','weld1e4']){const parts=mode==='indexed'?indexedParts(geo.attributes.position.array,index):connectedTriangleParts(geo.attributes.position.array,index,mode==='weld1e6'?1e6:1e4);row.partitions[mode]=parts.map(p=>({firstTriangle:p.firstTriangle,triangles:p.indices.length/3,...bounds(p,o)}))}console.log(file,o.name,row.materials,row.vertices,row.triangles,Object.fromEntries(Object.entries(row.partitions).map(([k,v])=>[k,v.length])))}inventory.push(row)});
 fs.writeFileSync('ingestion/output/focus-v3-inventory-'+file+'.json',JSON.stringify({file,sourceNodes:gltf.nodes,sourceMeshes:gltf.meshes,materials:gltf.materials.map(m=>m.name),inventory},null,2));
}
