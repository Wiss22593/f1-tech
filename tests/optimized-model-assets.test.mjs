import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { projectRoot, readGlb, readRoster, accessorBytes, viewBytes, sha256, makeCommonBase, makeSkin } from '../scripts/generate-optimized-models.mjs'

const manifest = JSON.parse(fs.readFileSync(path.join(projectRoot, 'src/three/optimized-model-manifest.json'), 'utf8'))
const local = publicPath => path.join(projectRoot, 'public', publicPath)
const base = readGlb(local(manifest.base.path))
const roster = readRoster()
const withoutView = accessor => {
  const metadata = { ...accessor }
  delete metadata.bufferView
  return metadata
}
const textureInfos = node => {
  if (!node || typeof node !== 'object') return []
  return Object.entries(node).flatMap(([key, value]) => key.endsWith('Texture') && value && typeof value === 'object' && Object.hasOwn(value, 'index') ? [value] : textureInfos(value))
}

// Source integrity, exact geometry and texture fidelity are essential regression
// tests: an apparently similar car can still have different component UVs.
test('optimized inventory resolves all current 22 drivers and 11 logical bases, with one Alpine-only UV exception', () => {
  assert.equal(manifest.version, 1)
  assert.equal(Object.keys(manifest.teams).length, 11)
  assert.equal(Object.keys(manifest.drivers).length, 22)
  assert.deepEqual(Object.keys(manifest.drivers).sort(), roster.map(item => item.originalPath).sort())
  assert.equal(new Set(Object.values(manifest.teams).map(team => team.basePath)).size, 1)
  for (const item of roster) {
    const driver = manifest.drivers[item.originalPath]
    assert.equal(driver.teamId, item.teamId)
    assert.equal(driver.driverId, item.driverId)
    assert.equal(driver.basePath, manifest.base.path)
    assert.deepEqual(driver.uvPatch, manifest.teams[item.teamId].uvPatch)
    assert.equal(Boolean(driver.uvPatch), item.teamId === 'alpine')
  }
  assert.deepEqual(manifest.base.textureRemap, [0, 1, 2, 3, 4, 5, null, null, null, null, 6, 7, 8, 9])
  assert.deepEqual(manifest.base.atlasMaterialIndices, [7, 8, 9, 10])
})

test('common base is valid aligned GLB with content-addressed bytes and retained texture definitions', () => {
  assert.equal(base.bytes.length, manifest.base.bytes)
  assert.equal(sha256(base.bytes), manifest.base.sha256)
  assert.ok(manifest.base.path.includes(manifest.base.sha256))
  assert.equal(base.json.images.length, 10)
  assert.equal(base.json.textures.length, 10)
  assert.equal(base.json.materials.length, 15)
  for (const [index, view] of base.json.bufferViews.entries()) {
    assert.equal((view.byteOffset ?? 0) % 4, 0, `view ${index} alignment`)
    assert.equal(viewBytes(base, index).length, view.byteLength)
  }
  for (const material of base.json.materials) for (const info of textureInfos(material)) assert.ok(base.json.textures[info.index], `Missing texture ${info.index}`)
  for (const index of manifest.base.atlasMaterialIndices) assert.equal(base.json.materials[index].pbrMetallicRoughness.baseColorTexture, undefined)
  for (const texture of base.json.textures) {
    assert.ok(base.json.images[texture.source])
    assert.ok(base.json.samplers[texture.sampler])
  }
})

test('all 22 optimized cars preserve original hierarchy, mesh topology, every accessor byte and exact authored PNG/material state', () => {
  const patchDefinition = manifest.teams.alpine.uvPatch
  const patch = fs.readFileSync(local(patchDefinition.path))
  assert.equal(patch.length, patchDefinition.bytes)
  assert.equal(patch.length, patchDefinition.count * 2 * 4)
  assert.equal(sha256(patch), patchDefinition.sha256)
  assert.equal(patchDefinition.attribute, 'uv1')
  assert.equal(patchDefinition.componentType, 5126)
  const patchAccessorIndex = base.json.meshes[patchDefinition.meshIndex].primitives[patchDefinition.primitiveIndex].attributes.TEXCOORD_1
  let accessorChecks = 0
  let originalBytes = 0
  for (const item of roster) {
    const driver = manifest.drivers[item.originalPath]
    const original = readGlb(local(item.originalPath))
    assert.equal(original.bytes.length, driver.originalBytes, `${item.originalPath}: source bytes`)
    assert.equal(sha256(original.bytes), driver.originalSha256, `${item.originalPath}: source SHA-256`)
    originalBytes += original.bytes.length
    for (const key of ['asset', 'scene', 'scenes', 'nodes', 'meshes', 'samplers']) assert.deepEqual(base.json[key], original.json[key], `${item.originalPath}: ${key}`)
    assert.equal(base.json.accessors.length, original.json.accessors.length)
    for (let index = 0; index < original.json.accessors.length; index++) {
      assert.deepEqual(withoutView(base.json.accessors[index]), withoutView(original.json.accessors[index]), `${item.originalPath}: accessor ${index} metadata`)
      const reconstructed = driver.uvPatch && index === patchAccessorIndex ? patch : accessorBytes(base, index)
      const authored = accessorBytes(original, index)
      assert.equal(Buffer.compare(reconstructed, authored), 0, `${item.originalPath}: accessor ${index} bytes`)
      accessorChecks++
    }
    const atlas = fs.readFileSync(local(driver.atlasPath))
    assert.equal(atlas.length, driver.atlasBytes)
    assert.equal(sha256(atlas), driver.atlasSha256)
    assert.equal(Buffer.compare(atlas, viewBytes(original, original.json.images[6].bufferView)), 0, `${item.originalPath}: exact embedded PNG`)
    assert.equal(atlas.readUInt32BE(16), driver.atlasWidth)
    assert.equal(atlas.readUInt32BE(20), driver.atlasHeight)
    const skinBytes = fs.readFileSync(local(driver.skinPath))
    assert.equal(skinBytes.length, driver.skinBytes)
    assert.equal(sha256(skinBytes), driver.skinSha256)
    const skin = JSON.parse(skinBytes)
    for (const key of ['asset', 'materials', 'textures', 'samplers']) assert.deepEqual(skin[key], original.json[key], `${item.originalPath}: authored ${key}`)
    assert.deepEqual(skin.nodes, [])
    assert.deepEqual(skin.scenes, [{ nodes: [] }])
    assert.equal(skin.meshes, undefined)
    assert.equal(skin.accessors, undefined)
    assert.equal(skin.buffers, undefined)
    assert.equal(skin.images[6].uri, path.basename(driver.atlasPath))
    for (const [index, image] of skin.images.entries()) {
      assert.equal(image.bufferView, undefined)
      if (index !== 6) {
        assert.equal(image.uri, 'shared-cache-only.png')
        const baseImageIndex = index > 6 ? index - 1 : index
        assert.equal(Buffer.compare(viewBytes(original, original.json.images[index].bufferView), viewBytes(base, base.json.images[baseImageIndex].bufferView)), 0, `${item.originalPath}: shared image ${index} bytes`)
      }
      assert.deepEqual({ ...image, uri: undefined, bufferView: undefined }, { ...original.json.images[index], uri: undefined, bufferView: undefined })
    }
    for (let index = 0; index < original.json.materials.length; index++) {
      const expected = structuredClone(original.json.materials[index])
      if (manifest.base.atlasMaterialIndices.includes(index)) delete expected.pbrMetallicRoughness.baseColorTexture
      else for (const info of textureInfos(expected)) info.index = manifest.base.textureRemap[info.index]
      assert.deepEqual(base.json.materials[index], expected, `${item.originalPath}: base material ${index}`)
    }
    for (const [index, texture] of original.json.textures.entries()) {
      const remapped = manifest.base.textureRemap[index]
      if (remapped === null) continue
      assert.deepEqual(base.json.textures[remapped], { ...texture, source: texture.source > 6 ? texture.source - 1 : texture.source })
    }
  }
  assert.ok(accessorChecks > 30_000, 'The audit must cover every geometry accessor across the 22 sources')
  assert.ok(originalBytes > 1_000_000_000)
})

test('generation is deterministic and refuses unsupported texture or buffer extensions', () => {
  const original = readGlb(local('/models/mercedes-w17-russell.glb'))
  assert.equal(sha256(makeCommonBase(original)), manifest.base.sha256)
  const driver = manifest.drivers['/models/mercedes-w17-russell.glb']
  const skin = Buffer.from(`${JSON.stringify(makeSkin(original.json, path.basename(driver.atlasPath)))}\n`)
  assert.equal(sha256(skin), driver.skinSha256)
  const extraAtlasReference = structuredClone(original.json)
  extraAtlasReference.materials[0].normalTexture = { index: 6 }
  assert.throws(() => makeSkin(extraAtlasReference, 'unused.png'), /Unreviewed atlas material references/)
  const extensionSource = { ...original, json: structuredClone(original.json) }
  extensionSource.json.bufferViews[0].extensions = { UNSUPPORTED_TEST: {} }
  assert.throws(() => makeCommonBase(extensionSource), /Buffer extensions require review/)
})
