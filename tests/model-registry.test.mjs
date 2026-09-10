import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('BGRT is the only active Garage model and Apex is never a fallback', async () => {
  const source = await readFile(new URL('../src/three/assets.ts', import.meta.url), 'utf8')
  assert.match(source, /activeCarAsset = carAssetRegistry\[0\]/)
  assert.match(source, /path: '\/models\/bgrt-f1-concept-2026\.glb'/)
  assert.doesNotMatch(source, /activeCarAsset\s*=\s*.*apex/i)
})
