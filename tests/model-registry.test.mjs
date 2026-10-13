import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('Garage selects the authored Alpine model only for Alpine and keeps BGRT as every other team fallback', async () => {
  const source = await readFile(new URL('../src/three/assets.ts', import.meta.url), 'utf8')
  const garage = await readFile(new URL('../src/features/garage/GaragePage.tsx', import.meta.url), 'utf8')
  const viewer = await readFile(new URL('../src/three/ModelViewer.tsx', import.meta.url), 'utf8')
  assert.match(source, /path: '\/models\/bgrt-f1-concept-2026\.glb'/)
  assert.match(source, /path: '\/models\/alpine-a526-formulatech\.glb'/)
  assert.match(source, /getCarAssetForTeam = \(teamId: string\).*teamId === 'alpine' \? alpineCarAsset : bgrtCarAsset/)
  assert.doesNotMatch(source, /getCarAssetForTeam.*apexCarAsset/)
  assert.match(garage, /asset=\{carAsset\}/)
  assert.match(viewer, /asset\.liveryMode === 'team-theme'/)
  assert.match(source, /alpine-a526-formulatech-evaluation'[\s\S]*?liveryMode: 'authored'/)
})
