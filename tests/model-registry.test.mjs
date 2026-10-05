import test from 'node:test'
import assert from 'node:assert/strict'
import { open, readFile } from 'node:fs/promises'
import { transpileModule, ModuleKind, ScriptTarget } from 'typescript'
import { bgrtModel, resolveTeamModel, teamModelManifest } from '../src/three/model-manifest.mjs'

const source = await readFile(new URL('../src/three/assets.ts', import.meta.url), 'utf8')
const absoluteManifest = new URL('../src/three/model-manifest.mjs', import.meta.url).href
const code = transpileModule(source.replace("'./model-manifest.mjs'", JSON.stringify(absoluteManifest)), { compilerOptions: { module: ModuleKind.ESNext, target: ScriptTarget.ES2022 } }).outputText
const { getCarAssetForTeam, carAssetRegistry } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
const teamSource = await readFile(new URL('../src/features/teams/data.ts', import.meta.url), 'utf8')
const teamCode = transpileModule(teamSource, { compilerOptions: { module: ModuleKind.ESNext } }).outputText
const { teams } = await import(`data:text/javascript;base64,${Buffer.from(teamCode).toString('base64')}`)

const expectedPaths = {
  alpine: '/models/alpine-a526-colapinto.glb',
  mercedes: '/models/mercedes-w17-antonelli.glb',
  ferrari: '/models/ferrari-sf26-leclerc.glb',
  'red-bull-racing': '/models/red-bull-rb22-verstappen.glb',
  mclaren: '/models/mclaren-mcl40-norris.glb',
  'racing-bulls': '/models/racing-bulls-vcarb03-lindblad.glb',
  haas: '/models/haas-vf26-bearman.glb',
  audi: '/models/audi-r26-bortoleto.glb',
  williams: '/models/williams-fw48-albon.glb',
  'aston-martin': '/models/aston-martin-amr26-alonso.glb',
  cadillac: '/models/cadillac-mac26-perez.glb',
}
test('each of the eleven teams resolves its exact custom GLB with a unique identity', () => {
  for (const [teamId, path] of Object.entries(expectedPaths)) {
    assert.equal(resolveTeamModel(teamId).path, path)
    assert.equal(resolveTeamModel(teamId).kind, 'custom')
    assert.equal(getCarAssetForTeam(teamId).path, path)
    assert.equal(getCarAssetForTeam(teamId).liveryMode, 'authored')
  }
  assert.equal(new Set(teams.map(team => getCarAssetForTeam(team.id).id)).size, 11)
})

test('manifest explicitly covers the same eleven teams as Garage', () => {
  assert.equal(teams.length, 11)
  assert.deepEqual(Object.keys(teamModelManifest).sort(), teams.map(team => team.id).sort())
  assert.ok(Object.isFrozen(teamModelManifest))
})
test('Alpine and Mercedes resolve their custom GLBs and preserve authored livery', () => {
  assert.equal(getCarAssetForTeam('alpine').path, '/models/alpine-a526-colapinto.glb')
  assert.equal(getCarAssetForTeam('mercedes').path, '/models/mercedes-w17-antonelli.glb')
  assert.equal(getCarAssetForTeam('alpine').id, 'alpine-a526-formulatech-evaluation', 'retain existing focus identity')
  for (const team of ['alpine', 'mercedes']) {
    assert.equal(resolveTeamModel(team).kind, 'custom')
    assert.equal(getCarAssetForTeam(team).liveryMode, 'authored')
    assert.equal(getCarAssetForTeam(team).path, teamModelManifest[team].path)
  }
})
test('unknown IDs retain defensive BGRT; Apex cannot be selected', () => {
  for (const id of ['unknown', 'apex', 'constructor', '__proto__', '']) {
    assert.equal(resolveTeamModel(id), bgrtModel)
    assert.equal(getCarAssetForTeam(id).path, '/models/bgrt-f1-concept-2026.glb')
    assert.equal(getCarAssetForTeam(id).liveryMode, 'team-theme')
  }
  assert.ok(carAssetRegistry.every(asset => !/apex/i.test(asset.id + asset.path)))
})
test('team round trips restore the same model independently of GP, locale and component', async () => {
  const initial = getCarAssetForTeam('alpine')
  for (const gp of ['bahrain-2026', 'italy-2026']) for (const locale of ['es', 'en']) for (const component of [undefined, 'halo', 'rearWing']) {
    for (const team of [...teams.map(team => team.id), ...teams.map(team => team.id).reverse()]) {
      const asset = Reflect.apply(getCarAssetForTeam, undefined, [team, { gp, locale, component }])
      assert.equal(asset, getCarAssetForTeam(team))
      assert.equal(asset.path, expectedPaths[team])
    }
    assert.equal(getCarAssetForTeam('alpine'), initial)
  }
  const garage = await readFile(new URL('../src/features/garage/GaragePage.tsx', import.meta.url), 'utf8')
  assert.match(garage, /getCarAssetForTeam\(team\.id\)/)
  const viewer = await readFile(new URL('../src/three/ModelViewer.tsx', import.meta.url), 'utf8')
  assert.match(viewer, /acquireCar\(props\.asset\.path\)/)
  assert.match(viewer, /<ActiveCar key=\{asset\.path\}/)
  assert.match(viewer, /<ViewerErrorBoundary key=\{asset\.path\}/)
  assert.match(viewer, /scene\.clone\(true\)/)
})
test('all selected paths exist as valid GLB containers with canonical custom filenames', async () => {
  for (const model of new Set(Object.values(teamModelManifest))) {
    if (model.kind === 'custom') assert.match(model.path, /^\/models\/[a-z0-9]+(?:-[a-z0-9]+)+\.glb$/)
    const file = await open(new URL(`../public${model.path}`, import.meta.url), 'r')
    try {
      const header = Buffer.alloc(12)
      await file.read(header,0,12,0)
      assert.equal(header.toString('ascii',0,4), 'glTF', model.path)
      assert.equal(header.readUInt32LE(4), 2)
      assert.equal(header.readUInt32LE(8), (await file.stat()).size)
    } finally { await file.close() }
  }
})
