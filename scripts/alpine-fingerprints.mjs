import fs from 'node:fs'
import { loadAuditScene } from './component-focus-audit.mjs'
import { geometryArrayHash } from '../src/three/component-mapping.mjs'
const file='src/three/component-mesh-map.json', maps=JSON.parse(fs.readFileSync(file)), mapping=maps['alpine-a526-formulatech-evaluation']
const {scene}=await loadAuditScene('public/models/'+mapping.file)
mapping.objectFingerprints={}
for(const name of new Set(Object.values(mapping.objects).flat())){
 const mesh=scene.getObjectByName(name)
 mapping.objectFingerprints[name]={positionHash:geometryArrayHash(mesh.geometry.attributes.position.array),indexHash:geometryArrayHash(mesh.geometry.index.array)}
}
fs.writeFileSync(file,JSON.stringify(maps,null,2)+'\n')
