/**
 * Deterministic, read-only source conversion for the audited 2026 showroom.
 * Run: node scripts/generate-optimized-models.mjs [--report absolute-report.json]
 * Existing source GLBs are opened only for reading. Unknown changes fail closed.
 */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { teamModelManifest } from '../src/three/model-manifest.mjs'

export const projectRoot = fileURLToPath(new URL('../', import.meta.url))
export const atlasImageIndex = 6
export const atlasMaterialIndices = [7, 8, 9, 10]
export const textureRemap = [0, 1, 2, 3, 4, 5, null, null, null, null, 6, 7, 8, 9]
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')
const jsonKeys = ['asset', 'scene', 'scenes', 'nodes', 'materials', 'meshes', 'textures', 'images', 'accessors', 'bufferViews', 'samplers', 'buffers']
const vectorWidths = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }
const componentWidths = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 }
const copy = value => structuredClone(value)

export function readGlb(file) {
  const bytes = fs.readFileSync(file)
  assert.equal(bytes.readUInt32LE(0), 0x46546c67, `${file}: GLB magic`)
  assert.equal(bytes.readUInt32LE(4), 2, `${file}: GLB version`)
  assert.equal(bytes.readUInt32LE(8), bytes.length, `${file}: GLB declared length`)
  const jsonLength = bytes.readUInt32LE(12)
  assert.equal(bytes.readUInt32LE(16), 0x4e4f534a, `${file}: JSON chunk`)
  assert.equal(jsonLength % 4, 0)
  const json = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString('utf8'))
  const binaryHeader = 20 + jsonLength
  assert.equal(bytes.readUInt32LE(binaryHeader + 4), 0x004e4942, `${file}: BIN chunk`)
  const binaryLength = bytes.readUInt32LE(binaryHeader)
  assert.equal(binaryHeader + 8 + binaryLength, bytes.length, `${file}: exactly two chunks`)
  assert.equal(binaryLength % 4, 0)
  assert.equal(json.buffers.length, 1)
  assert.equal(json.buffers[0].uri, undefined)
  assert.ok(json.buffers[0].byteLength <= binaryLength)
  assert.ok(binaryLength - json.buffers[0].byteLength < 4)
  return { bytes, json, bin: bytes.subarray(binaryHeader + 8, binaryHeader + 8 + json.buffers[0].byteLength) }
}

export function viewBytes(source, index) {
  const view = source.json.bufferViews[index]
  assert.ok(view, `Missing buffer view ${index}`)
  assert.equal(view.buffer, 0)
  const offset = view.byteOffset ?? 0
  assert.ok(offset >= 0 && offset + view.byteLength <= source.bin.length, `Buffer view ${index} bounds`)
  return source.bin.subarray(offset, offset + view.byteLength)
}

export function accessorBytes(source, index) {
  const accessor = source.json.accessors[index]
  assert.ok(accessor && !accessor.sparse, `Unsupported or missing accessor ${index}`)
  const elementWidth = vectorWidths[accessor.type] * componentWidths[accessor.componentType]
  assert.ok(elementWidth, `Unsupported accessor ${index} encoding`)
  const view = source.json.bufferViews[accessor.bufferView]
  const bytes = viewBytes(source, accessor.bufferView)
  const offset = accessor.byteOffset ?? 0
  const stride = view.byteStride ?? elementWidth
  assert.ok(stride >= elementWidth)
  assert.ok(offset + Math.max(0, accessor.count - 1) * stride + elementWidth <= bytes.length)
  const result = Buffer.alloc(accessor.count * elementWidth)
  for (let row = 0; row < accessor.count; row++) bytes.copy(result, row * elementWidth, offset + row * stride, offset + row * stride + elementWidth)
  return result
}

export function readRoster(root = projectRoot) {
  const source = fs.readFileSync(path.join(root, 'src/features/garage/showroom.ts'), 'utf8')
  const body = source.slice(source.indexOf('export const showroomTeams:'), source.indexOf('const availableModels'))
  const teams = [...body.matchAll(/^\s*'([^']+)':\s*\{\s*carName:[^\r\n]*drivers:\s*\[/gm)]
  assert.equal(teams.length, 11, 'Expected exactly 11 current showroom teams')
  const roster = []
  for (let index = 0; index < teams.length; index++) {
    const teamId = teams[index][1]
    assert.ok(Object.hasOwn(teamModelManifest, teamId), `Unknown team ${teamId}`)
    const segment = body.slice(teams[index].index, teams[index + 1]?.index ?? body.length)
    const drivers = [...segment.matchAll(/\{\s*id:\s*'([^']+)'[^\r\n]*modelPath:\s*([^}\r\n]+)\}/g)]
    assert.equal(drivers.length, 2, `${teamId}: expected two drivers`)
    for (const [, driverId, expression] of drivers) {
      const expressionText = expression.trim().replace(/,$/, '')
      const literal = expressionText.match(/^'([^']+)'$/)
      const manifestReference = expressionText.match(/^teamModelManifest\['([^']+)'\]\.path$/)
      assert.ok(literal || manifestReference, `${teamId}/${driverId}: unknown model expression`)
      if (manifestReference) assert.equal(manifestReference[1], teamId)
      const originalPath = literal?.[1] ?? teamModelManifest[teamId].path
      assert.match(originalPath, /^\/models\/[a-z0-9-]+\.glb$/)
      roster.push({ teamId, driverId, originalPath })
    }
  }
  assert.equal(roster.length, 22)
  assert.equal(new Set(roster.map(item => item.originalPath)).size, 22)
  return roster
}

function normalizeSourceJson(source) {
  const json = copy(source.json)
  assert.deepEqual(Object.keys(json).sort(), [...jsonKeys].sort(), 'Unreviewed glTF top-level fields or extensions')
  assert.equal(json.images.length, 11)
  assert.equal(json.textures.length, textureRemap.length)
  assert.equal(json.materials.length, 15)
  json.buffers[0].byteLength = 0
  for (const view of json.bufferViews) view.byteOffset = 0
  const atlasView = json.images[atlasImageIndex].bufferView
  json.bufferViews[atlasView].byteLength = 0
  json.images[atlasImageIndex].name = 'AUDITED_DRIVER_ATLAS'
  for (const accessor of json.accessors) {
    assert.equal(accessor.sparse, undefined, 'Sparse geometry requires a separate review')
    assert.notEqual(accessor.bufferView, atlasView, 'Atlas bytes cannot also carry geometry')
  }
  return json
}

function inspectAtlasReferences(json) {
  assert.deepEqual(json.textures.flatMap((texture, index) => texture.source === atlasImageIndex ? [index] : []), [6, 7, 8, 9])
  const references = []
  const walk = (node, prefix, materialIndex) => {
    if (!node || typeof node !== 'object') return
    for (const [key, value] of Object.entries(node)) {
      if (key.endsWith('Texture') && value && typeof value === 'object' && json.textures[value.index]?.source === atlasImageIndex) references.push([materialIndex, `${prefix}${key}`, value.index])
      walk(value, `${prefix}${key}.`, materialIndex)
    }
  }
  json.materials.forEach((material, index) => walk(material, '', index))
  assert.deepEqual(references, atlasMaterialIndices.map((index, offset) => [index, 'pbrMetallicRoughness.baseColorTexture', 6 + offset]), 'Unreviewed atlas material references')
}

export function makeCommonBase(source) {
  inspectAtlasReferences(source.json)
  const json = copy(source.json)
  const removedView = json.images[atlasImageIndex].bufferView
  const viewRemap = new Map()
  const chunks = []
  const bufferViews = []
  let offset = 0
  for (let index = 0; index < json.bufferViews.length; index++) {
    if (index === removedView) continue
    const view = json.bufferViews[index]
    assert.equal(view.extensions, undefined, 'Buffer extensions require review')
    const padding = (4 - (offset % 4)) % 4
    if (padding) { chunks.push(Buffer.alloc(padding)); offset += padding }
    const bytes = viewBytes(source, index)
    viewRemap.set(index, bufferViews.length)
    bufferViews.push({ ...view, byteOffset: offset })
    chunks.push(bytes)
    offset += bytes.length
  }
  json.bufferViews = bufferViews
  for (const accessor of json.accessors) {
    assert.ok(viewRemap.has(accessor.bufferView))
    accessor.bufferView = viewRemap.get(accessor.bufferView)
  }
  json.images = json.images.filter((_, index) => index !== atlasImageIndex).map(image => {
    assert.ok(viewRemap.has(image.bufferView))
    return { ...image, bufferView: viewRemap.get(image.bufferView) }
  })
  json.textures = json.textures.filter((_, index) => textureRemap[index] !== null).map(texture => ({ ...texture, source: texture.source > atlasImageIndex ? texture.source - 1 : texture.source }))
  const remapTextureInfo = node => {
    if (!node || typeof node !== 'object') return
    for (const [key, value] of Object.entries(node)) {
      if (key.endsWith('Texture') && value && typeof value === 'object' && Object.hasOwn(value, 'index')) {
        const remapped = textureRemap[value.index]
        if (remapped === null) delete node[key]
        else { assert.notEqual(remapped, undefined); value.index = remapped }
      } else remapTextureInfo(value)
    }
  }
  json.materials.forEach(remapTextureInfo)
  json.buffers = [{ ...json.buffers[0], byteLength: offset }]
  const jsonBytes = Buffer.from(JSON.stringify(json))
  const paddedJson = Buffer.concat([jsonBytes, Buffer.alloc((4 - (jsonBytes.length % 4)) % 4, 0x20)])
  const paddedBin = Buffer.concat([...chunks, Buffer.alloc((4 - (offset % 4)) % 4)])
  const header = Buffer.alloc(20)
  header.writeUInt32LE(0x46546c67, 0)
  header.writeUInt32LE(2, 4)
  header.writeUInt32LE(28 + paddedJson.length + paddedBin.length, 8)
  header.writeUInt32LE(paddedJson.length, 12)
  header.writeUInt32LE(0x4e4f534a, 16)
  const binaryHeader = Buffer.alloc(8)
  binaryHeader.writeUInt32LE(paddedBin.length, 0)
  binaryHeader.writeUInt32LE(0x004e4942, 4)
  return Buffer.concat([header, paddedJson, binaryHeader, paddedBin])
}

export function makeSkin(json, atlasFilename) {
  inspectAtlasReferences(json)
  return {
    asset: copy(json.asset), scene: 0, scenes: [{ nodes: [] }], nodes: [],
    materials: copy(json.materials), textures: copy(json.textures), samplers: copy(json.samplers),
    images: json.images.map((image, index) => {
      const descriptor = copy(image)
      delete descriptor.bufferView
      descriptor.uri = index === atlasImageIndex ? atlasFilename : 'shared-cache-only.png'
      return descriptor
    }),
  }
}

function writeIdenticalOrNew(file, bytes) {
  if (fs.existsSync(file)) {
    assert.equal(sha256(fs.readFileSync(file)), sha256(bytes), `Existing generated asset differs: ${file}`)
    return
  }
  fs.writeFileSync(file, bytes, { flag: 'wx' })
}

export function generateOptimizedModels({ root = projectRoot, reportPath } = {}) {
  const roster = readRoster(root)
  const sourceFile = item => path.join(root, 'public', item.originalPath)
  const referenceItem = roster.find(item => item.driverId === 'russell')
  assert.ok(referenceItem)
  const reference = readGlb(sourceFile(referenceItem))
  const normalizedReference = normalizeSourceJson(reference)
  inspectAtlasReferences(reference.json)
  assert.equal(reference.json.meshes[236].name, 'GEO_MAIN_BODY_3_366')
  const uvIndex = reference.json.meshes[236].primitives[0].attributes.TEXCOORD_1
  const uvViewIndex = reference.json.accessors[uvIndex].bufferView
  const uvAccessor = reference.json.accessors[uvIndex]
  assert.deepEqual({ componentType: uvAccessor.componentType, count: uvAccessor.count, type: uvAccessor.type }, { componentType: 5126, count: 18252, type: 'VEC2' })
  assert.deepEqual(reference.json.accessors.flatMap((accessor, index) => accessor.bufferView === uvViewIndex ? [index] : []), [uvIndex], 'Alpine patch view must belong to a single accessor')
  const referenceViewHashes = reference.json.bufferViews.map((_, index) => sha256(viewBytes(reference, index)))
  const atlasViewIndex = reference.json.images[atlasImageIndex].bufferView
  const audited = []
  let alpinePatchBytes
  let alpinePatchHash
  // Audit every source before any generated asset is written.
  for (const item of roster) {
    const source = item === referenceItem ? reference : readGlb(sourceFile(item))
    assert.deepEqual(normalizeSourceJson(source), normalizedReference, `${item.originalPath}: unreviewed JSON difference`)
    inspectAtlasReferences(source.json)
    const changedViews = []
    for (let index = 0; index < source.json.bufferViews.length; index++) {
      const hash = sha256(viewBytes(source, index))
      if (hash === referenceViewHashes[index]) continue
      changedViews.push(index)
      assert.ok(index === atlasViewIndex || (item.teamId === 'alpine' && index === uvViewIndex), `${item.originalPath}: incompatible buffer view ${index}`)
    }
    const patch = item.teamId === 'alpine'
    assert.equal(changedViews.includes(uvViewIndex), patch, `${item.originalPath}: unexpected Alpine UV compatibility`)
    if (patch) {
      const packed = accessorBytes(source, uvIndex)
      const hash = sha256(packed)
      if (!alpinePatchBytes) { alpinePatchBytes = packed; alpinePatchHash = hash }
      else assert.equal(hash, alpinePatchHash, 'Alpine teammates have incompatible UV1')
    }
    const atlas = viewBytes(source, atlasViewIndex)
    assert.equal(source.json.images[atlasImageIndex].mimeType, 'image/png')
    assert.equal(atlas.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', 'Atlas is exact embedded PNG')
    const width = atlas.readUInt32BE(16), height = atlas.readUInt32BE(20)
    assert.ok(width > 0 && height > 0)
    const atlasHash = sha256(atlas)
    const atlasFilename = `atlas-${atlasHash}.png`
    const skinBytes = Buffer.from(`${JSON.stringify(makeSkin(source.json, atlasFilename))}\n`)
    audited.push({ ...item, originalSha256: sha256(source.bytes), originalBytes: source.bytes.length, atlasBytes: atlas.length, atlasSha256: atlasHash, atlasFilename, atlasWidth: width, atlasHeight: height, skinBytes, changedViews, uvException: patch })
  }
  const referenceUvBytes = accessorBytes(reference, uvIndex)
  let changedUvScalars = 0
  let maxAbsoluteUvDifference = 0
  for (let offset = 0; offset < alpinePatchBytes.length; offset += 4) {
    const originalUv = referenceUvBytes.readFloatLE(offset), alpineUv = alpinePatchBytes.readFloatLE(offset)
    assert.ok(Number.isFinite(originalUv) && Number.isFinite(alpineUv), 'Non-finite UV patch values')
    if (originalUv !== alpineUv) { changedUvScalars++; maxAbsoluteUvDifference = Math.max(maxAbsoluteUvDifference, Math.abs(originalUv - alpineUv)) }
  }
  const target = path.join(root, 'public/models-optimized')
  fs.mkdirSync(target, { recursive: true })
  const baseBytes = makeCommonBase(reference)
  const baseHash = sha256(baseBytes)
  const baseFilename = `base-${baseHash}.glb`
  const basePath = `/models-optimized/${baseFilename}`
  writeIdenticalOrNew(path.join(target, baseFilename), baseBytes)
  assert.ok(alpinePatchBytes)
  const patchFilename = `uv1-${alpinePatchHash}.bin`
  writeIdenticalOrNew(path.join(target, patchFilename), alpinePatchBytes)
  const uvPatch = { path: `/models-optimized/${patchFilename}`, meshIndex: 236, primitiveIndex: 0, attribute: 'uv1', count: uvAccessor.count, componentType: uvAccessor.componentType, sha256: alpinePatchHash, bytes: alpinePatchBytes.length }
  const manifest = {
    version: 1,
    base: { path: basePath, sha256: baseHash, bytes: baseBytes.length, textureRemap, atlasMaterialIndices },
    teams: {}, drivers: {},
  }
  const resources = new Map([[baseFilename, baseBytes.length], [patchFilename, alpinePatchBytes.length]])
  for (const item of audited) {
    const source = readGlb(sourceFile(item))
    assert.equal(sha256(source.bytes), item.originalSha256, `${item.originalPath}: source changed during generation`)
    writeIdenticalOrNew(path.join(target, item.atlasFilename), viewBytes(source, source.json.images[atlasImageIndex].bufferView))
    const skinHash = sha256(item.skinBytes)
    const skinFilename = `skin-${skinHash}.gltf`
    writeIdenticalOrNew(path.join(target, skinFilename), item.skinBytes)
    resources.set(item.atlasFilename, item.atlasBytes)
    resources.set(skinFilename, item.skinBytes.length)
    const common = { basePath, ...(item.uvException ? { uvPatch } : {}) }
    manifest.teams[item.teamId] ??= common
    assert.deepEqual(manifest.teams[item.teamId], common)
    manifest.drivers[item.originalPath] = {
      teamId: item.teamId, driverId: item.driverId, ...common,
      skinPath: `/models-optimized/${skinFilename}`, skinBytes: item.skinBytes.length, skinSha256: skinHash,
      atlasPath: `/models-optimized/${item.atlasFilename}`, atlasBytes: item.atlasBytes, atlasSha256: item.atlasSha256,
      atlasWidth: item.atlasWidth, atlasHeight: item.atlasHeight,
      originalBytes: item.originalBytes, originalSha256: item.originalSha256,
    }
  }
  const totalGeneratedBytes = [...resources.values()].reduce((sum, bytes) => sum + bytes, 0)
  assert.ok(totalGeneratedBytes < 500_000_000, 'Unexpected generated storage above 500 MB; review required')
  const manifestFile = path.join(root, 'src/three/optimized-model-manifest.json')
  const manifestBytes = `${JSON.stringify(manifest, null, 2)}\n`
  if (!fs.existsSync(manifestFile) || fs.readFileSync(manifestFile, 'utf8') !== manifestBytes) fs.writeFileSync(manifestFile, manifestBytes)
  const geometryViews = new Set(reference.json.accessors.map(accessor => accessor.bufferView))
  const geometryBufferBytes = [...geometryViews].reduce((sum, index) => sum + viewBytes(reference, index).length, 0)
  const sharedPngBytes = reference.json.images.reduce((sum, image, index) => sum + (index === atlasImageIndex ? 0 : viewBytes(reference, image.bufferView).length), 0)
  const report = {
    version: 1, units: 'bytes; decimal MB = bytes / 1,000,000; transfer estimates exclude HTTP headers and compression',
    methodology: 'Exact JSON equivalence and SHA-256 of every original bufferView. Only image6 atlas bytes/name and Alpine mesh236 TEXCOORD_1 are allowed differences. No tolerance or re-encoding. Original hashes checked again after output generation.',
    sourceFileCount: roster.length, logicalTeamBases: Object.keys(manifest.teams).length, physicalBaseFiles: 1,
    base: manifest.base,
    baseBreakdown: { meshes: reference.json.meshes.length, nodes: reference.json.nodes.length, accessors: reference.json.accessors.length, geometryBufferViews: geometryViews.size, geometryBufferBytes, retainedPngImages: 10, retainedPngBytes: sharedPngBytes, jsonHeadersAndAlignmentBytes: baseBytes.length - geometryBufferBytes - sharedPngBytes },
    alpineUvPatch: uvPatch,
    alpineUvDifference: { accessorIndex: uvIndex, scalarCount: uvAccessor.count * 2, changedUvScalars, maxAbsoluteUvDifference, tolerance: 0, source: 'Original packed Float32 TEXCOORD_1 bytes, no conversion or re-encoding' },
    totalOriginalBytes: audited.reduce((sum, item) => sum + item.originalBytes, 0),
    totalGeneratedBytes, resources: [...resources].map(([filename, bytes]) => ({ path: `/models-optimized/${filename}`, bytes })),
    inventory: audited.map(item => {
      const driver = manifest.drivers[item.originalPath]
      const firstLoadBytes = baseBytes.length + driver.skinBytes + driver.atlasBytes + (driver.uvPatch?.bytes ?? 0)
      const teammateSwitchBytes = driver.skinBytes + driver.atlasBytes
      return { originalPath: item.originalPath, ...driver, exactChangedBufferViews: item.changedViews, firstLoadBytes, firstLoadSavingsBytes: driver.originalBytes - firstLoadBytes, teammateSwitchBytes, teammateSwitchSavingsBytes: driver.originalBytes - teammateSwitchBytes, teammateSwitchSavingsPercent: 100 * (1 - teammateSwitchBytes / driver.originalBytes), cachedReturnAssetBodyBytes: 0, cacheCondition: 'Return estimate assumes browser immutable HTTP cache retains content-hashed assets. First change assumes base is already loaded.' }
    }),
  }
  if (reportPath) { fs.mkdirSync(path.dirname(reportPath), { recursive: true }); fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`) }
  return { manifest, report }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const reportFlag = process.argv.indexOf('--report')
  const reportPath = reportFlag === -1 ? undefined : process.argv[reportFlag + 1]
  if (reportFlag !== -1) assert.ok(reportPath, '--report requires a file path')
  const { manifest, report } = generateOptimizedModels({ reportPath })
  console.log(JSON.stringify({ originalFilesIntact: report.sourceFileCount, logicalTeamBases: report.logicalTeamBases, physicalBaseFiles: report.physicalBaseFiles, baseBytes: manifest.base.bytes, generatedBytes: report.totalGeneratedBytes, drivers: Object.keys(manifest.drivers).length, reportPath: reportPath ?? null }))
}
