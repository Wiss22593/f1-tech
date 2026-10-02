import fs from 'node:fs'
import { createHash } from 'node:crypto'
import { Box3, Vector3, Raycaster } from 'three'
import { loadAuditScene, indexedParts } from './component-focus-audit.mjs'
import { componentMeshMappings } from '../src/three/component-mapping.mjs'
import { createComponentIsolation } from '../src/three/component-isolation.mjs'
const id = 'alpine-a526-formulatech-evaluation', mapping = componentMeshMappings[id]
const { scene, gltf, bytes } = await loadAuditScene('public/models/' + mapping.file)
const bounds = (mesh, indices) => {
  const box = new Box3(), point = new Vector3()
  for (const index of new Set(indices)) box.expandByPoint(point.fromBufferAttribute(mesh.geometry.attributes.position, index).applyMatrix4(mesh.matrixWorld))
  return { min: box.min.toArray(), max: box.max.toArray(), center: box.getCenter(new Vector3()).toArray() }
}
const inventory = [], wheels = []
scene.traverse(node => { if (node.isMesh && /^(TIRE_|GEO_WHEEL_STATIC)/.test(node.name)) wheels.push(node) })
scene.traverse(node => {
  const row = { name: node.name, type: node.type, parent: node.parent?.name ?? null, children: node.children.map(child => child.name), matrixWorld: node.matrixWorld.toArray() }
  if (node.isMesh) {
    const geometry = node.geometry, index = geometry.index.array
    row.materials = (Array.isArray(node.material) ? node.material : [node.material]).map(material => ({ name: material.name, type: material.type, opacity: material.opacity, transparent: material.transparent }))
    row.vertices = geometry.attributes.position.count; row.triangles = index.length / 3
    Object.assign(row, bounds(node, index))
    const rule = mapping.meshRules.find(rule => {
      if (rule.node === node.name) return true
      return node.parent?.name === rule.node && node.parent.children.filter(child => child.isMesh).indexOf(node) === (rule.primitive ?? 0)
    })
    const whole = Object.entries(mapping.objects).filter(([, names]) => names.includes(node.name)).map(([component]) => component)
    row.islands = (rule ? indexedParts(geometry.attributes.position.array, index) : [{ firstTriangle: 0, indices: index }]).map(part => {
      const components = rule ? Object.entries(rule.components).filter(([, selectors]) => selectors.some(selector => selector.firstTriangle === part.firstTriangle && selector.triangles === part.indices.length / 3)).map(([component]) => component) : whole
      const item = { firstTriangle: part.firstTriangle, triangles: part.indices.length / 3, ...bounds(node, part.indices), components, category: components.length ? 'audited-mapping' : 'unknown/manual-review' }
      if (components.some(component => mapping.internalComponents.includes(component))) {
        const ids = [...new Set(part.indices)], sample = ids.filter((_, i) => i % Math.max(1, Math.floor(ids.length / 8)) === 0).slice(0, 8)
        let blocked = 0
        for (const vertex of sample) {
          const target = new Vector3().fromBufferAttribute(geometry.attributes.position, vertex).applyMatrix4(node.matrixWorld)
          const origin = target.clone(); origin.x += target.x < 0 ? -5 : 5
          const ray = new Raycaster(origin, target.clone().sub(origin).normalize(), 0, 4.9999)
          if (ray.intersectObjects(scene.children.filter(mesh => mesh.isMesh && mesh !== node), false).length) blocked++
        }
        item.occlusion = { method: 'outboard lateral vertex rays against original scene triangles', samples: sample.length, blockedByGeometry: blocked, scope: 'view-dependent evidence; not proof of an enclosed internal mechanism' }
      }
      return item
    })
  }
  inventory.push(row)
})
const controller = createComponentIsolation(scene, id)
const snapshot = controller.snapshot(); controller.dispose()
const report = { assetId: id, sha256: createHash('sha256').update(bytes).digest('hex'), coordinateSpace: 'GLTF world, before viewer scale 1.1', sourceNodes: gltf.nodes, sourceMeshes: gltf.meshes, sourceMaterials: gltf.materials, inventory, components: Object.fromEntries(Object.entries(snapshot.targets).map(([component, targets]) => [component, { mode: mapping.internalComponents.includes(component) ? 'internal' : 'external', targets }])), failures: snapshot.failures }
for (const value of Object.values(report.components)) for (const target of value.targets) delete target.meshUuid
fs.writeFileSync('docs/alpine-v2-inventory.json', JSON.stringify(report, null, 2) + '\n')
console.log(JSON.stringify({ nodes: inventory.length, meshes: inventory.filter(row => row.islands).length, components: Object.keys(report.components), unknownIslands: inventory.flatMap(row => row.islands ?? []).filter(item => !item.components.length).length, occlusion: inventory.flatMap(row => row.islands ?? []).filter(item => item.occlusion).reduce((total, item) => ({ samples: total.samples + item.occlusion.samples, blocked: total.blocked + item.occlusion.blockedByGeometry }), { samples: 0, blocked: 0 }), failures: report.failures }))
