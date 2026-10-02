import { TextureLoader } from 'three'

export const liveryTextureLimit = 4096
export function boundedTextureSize(width, height, limit = liveryTextureLimit) {
  const scale = Math.min(1, limit / Math.max(width, height))
  return [Math.max(1, Math.floor(width * scale)), Math.max(1, Math.floor(height * scale))]
}

// Avoid ImageBitmap decoding of the 9216px atlas. Bound the upload once per
// source, before GLTFLoader caches it; texCoord, color space and samplers are
// still assigned by GLTFLoader. Never change the source GLB or cached materials.
class BoundedTextureLoader extends TextureLoader {
  load(url, onLoad, onProgress, onError) {
    return super.load(url, texture => {
      try {
        const image = texture.image
        const [width, height] = boundedTextureSize(image.width, image.height)
        if (width !== image.width || height !== image.height) {
          const canvas = document.createElement('canvas')
          canvas.width = width; canvas.height = height
          const context = canvas.getContext('2d')
          if (!context) throw new Error('Livery image conversion unavailable')
          context.drawImage(image, 0, 0, width, height)
          texture.image = canvas
          texture.needsUpdate = true
        }
        onLoad?.(texture)
      } catch (error) { onError?.(error) }
    }, onProgress, onError)
  }
}

export function assertAuthoredTextures(result) {
  result.scene.traverse(mesh => {
    if (!mesh.isMesh) return
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      const index = result.parser.associations.get(material)?.materials
      const definition = result.parser.json.materials[index]
      if (definition?.pbrMetallicRoughness?.baseColorTexture && !material.map) {
        // GLTFLoader otherwise swallows a decode failure, returns map=null and
        // caches a successfully loaded, white car. Fail the load instead.
        throw new Error(`Authored livery texture missing: ${material.name}`)
      }
    }
  })
}

function authoredLiveryPlugin(parser) {
  if (!parser.json.materials?.some(material => material.name === 'MAIN_BODY_ALPINE_FINAL')) return { name: 'F1TechAuthoredLivery' }
  const loader = new BoundedTextureLoader(parser.options.manager)
  loader.setCrossOrigin(parser.options.crossOrigin)
  loader.setRequestHeader(parser.options.requestHeader)
  return {
    name: 'F1TechAuthoredLivery',
    loadTexture(index) {
      const texture = parser.json.textures[index]
      const image = parser.json.images[texture.source]
      return image?.mimeType === 'image/png' ? parser.loadTextureImage(index, texture.source, loader) : null
    },
    async afterRoot(result) { assertAuthoredTextures(result) },
  }
}
export function configureAuthoredLiveryLoader(loader) { loader.register(authoredLiveryPlugin) }
