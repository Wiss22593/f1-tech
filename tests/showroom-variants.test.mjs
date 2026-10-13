import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { loadAuditScene } from '../scripts/component-focus-audit.mjs'
import { createComponentIsolation, isolationBrightness } from '../src/three/component-isolation.mjs'
import { normalizeUniversalManifest } from '../src/three/universal-maps.mjs'
import { teamModelManifest } from '../src/three/model-manifest.mjs'
import { disposeCarScene } from '../src/three/car-loader.mjs'

const manifest = normalizeUniversalManifest(JSON.parse(readFileSync('public/models/F1tech_maps_manifest.json', 'utf8')))
const pairs = {
  alpine: ['alpine-a526-colapinto.glb', 'alpine-a526-gasly.glb'],
  'racing-bulls': ['racing-bulls-vcarb03-lindblad.glb', 'racing-bulls-vcarb03-lawson.glb'],
  ferrari: ['ferrari-sf26-leclerc.glb', 'ferrari-sf26-hamilton.glb'],
  mercedes: ['mercedes-w17-antonelli.glb', 'mercedes-w17-russell.glb'],
}
test('both actual driver variants retain universal focus and clean up in the four required teams', async () => {
  const { scene: maps } = await loadAuditScene('public/models/F1tech_maps.glb')
  for (const [team, files] of Object.entries(pairs)) for (const file of files) {
    const { scene } = await loadAuditScene('public/models/' + file)
    const originals = []
    scene.traverse(mesh => { if (mesh.isMesh) originals.push([mesh, mesh.material, mesh.geometry]) })
    const controller = createComponentIsolation(scene, teamModelManifest[team].assetId, undefined, undefined, { scene: maps, manifest })
    assert.deepEqual(controller.snapshot().failures, [], file)
    for (const component of ['frontWing', 'MAP_FLOOR', 'MAP_DIFFUSER', 'MAP_ENGINE_COVER', 'MAP_AIRBOX', 'frontSuspension']) {
      assert.ok(controller.highlightable.includes(component), file + ' ' + component)
      assert.ok(controller.resolveTargets(component).length, file + ' ' + component)
      controller.select(component); controller.step(1)
      const snapshot = controller.snapshot()
      assert.equal(snapshot.active, component)
      assert.ok(snapshot.materials.some(m => m.components.includes(component) && m.gain === 1))
      assert.ok(snapshot.materials.some(m => !m.components.includes(component) && m.gain === isolationBrightness))
    }
    controller.select(); controller.step(1)
    assert.equal(controller.snapshot().mode, 'normal')
    controller.dispose()
    for (const [mesh, material, geometry] of originals) {
      assert.equal(mesh.material, material); assert.equal(mesh.geometry, geometry)
    }
    disposeCarScene(scene)
  }
  disposeCarScene(maps)
})
