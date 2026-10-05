import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { transpileModule, ModuleKind, ScriptTarget } from 'typescript'
import { teamModelManifest } from '../src/three/model-manifest.mjs'

const source = await readFile(new URL('../src/features/garage/showroom.ts', import.meta.url), 'utf8')
const files = await readdir(new URL('../public/models/', import.meta.url))
async function loadConfig(paths) {
  const code = transpileModule(source
    .replace("'../../three/model-manifest.mjs'", JSON.stringify(new URL('../src/three/model-manifest.mjs', import.meta.url).href))
    .replace("import.meta.glob('/public/models/*.glb')", JSON.stringify(Object.fromEntries(paths.map(path => [`/public${path}`, {}])))),
  { compilerOptions: { module: ModuleKind.ESNext, target: ScriptTarget.ES2022 } }).outputText
  return import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
}
const config = await loadConfig(files.map(file => `/models/${file}`))
test('showroom has two drivers per team, matching every available primary GLB; absent skins cannot load', () => {
  assert.deepEqual(Object.keys(config.showroomTeams).sort(), Object.keys(teamModelManifest).sort())
  for (const [id, team] of Object.entries(config.showroomTeams)) {
    const base = { id: teamModelManifest[id].assetId, path: teamModelManifest[id].path }
    assert.equal(team.drivers.length, 2)
    assert.equal(team.drivers[0].modelPath, base.path)
    assert.equal(config.isDriverAvailable(team.drivers[0]), true)
    assert.equal(config.isDriverAvailable(team.drivers[1]), false)
    assert.equal(config.getDriverAsset(base, team.drivers[0]), base)
    assert.equal(config.getDriverAsset(base, team.drivers[1]), base)
    assert.match(team.drivers[1].modelPath, /^\/models\/[a-z0-9-]+\.glb$/)
  }
})
test('adding a configured second skin activates it and changes only the path, retaining geometry and cameras', async () => {
  const second = config.showroomTeams.alpine.drivers[1]
  const future = await loadConfig(files.map(file => `/models/${file}`).concat(second.modelPath))
  const base = { id: teamModelManifest.alpine.assetId, path: teamModelManifest.alpine.path, cameraPresets: { default: [4.8, 2.75, 5.6] }, nodes: {}, liveryMode: 'authored' }
  assert.equal(future.isDriverAvailable(second), true)
  assert.deepEqual(future.getDriverAsset(base, second), { ...base, path: second.modelPath })
  assert.equal(base.path, teamModelManifest.alpine.path)
})


test('2026 driver numbers are roster data and existing variant assignments stay intact', () => {
  const expected = { antonelli: 12, russell: 63, leclerc: 16, hamilton: 44, norris: 1, piastri: 81, verstappen: 3, hadjar: 6, lindblad: 41, lawson: 30, colapinto: 43, gasly: 10, bearman: 87, ocon: 31, bortoleto: 5, hulkenberg: 27, albon: 23, sainz: 55, alonso: 14, stroll: 18, perez: 11, bottas: 77 }
  const drivers = Object.values(config.showroomTeams).flatMap(team => team.drivers)
  assert.deepEqual(Object.fromEntries(drivers.map(driver => [driver.id, driver.number])), expected)
  for (const team of Object.values(config.showroomTeams)) {
    assert.deepEqual(config.orderedDrivers(team).map(driver => driver.id), team.drivers.map(driver => driver.id))
  }
})

test('an available reserve variant requires verified yellow airbox metadata', () => {
  const driver = config.showroomTeams.alpine.drivers[0]
  const reserve = { ...driver, role: 'reserve' }
  assert.equal(config.isDriverAvailable(reserve), false)
  assert.equal(config.isDriverAvailable({ ...reserve, airboxColor: 'black' }), false)
  assert.equal(config.isDriverAvailable({ ...reserve, airboxColor: 'yellow' }), true)
  assert.equal(config.isDriverAvailable({ ...reserve, airboxColor: 'yellow', modelPath: '/models/not-loaded.glb' }), false)
  assert.equal(driver.role, null)
  assert.equal(config.isDriverAvailable(driver), true)
})
