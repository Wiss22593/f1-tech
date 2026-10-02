import type { GLTF, GLTFLoader } from 'three-stdlib'
export const liveryTextureLimit: number
export function boundedTextureSize(width: number, height: number, limit?: number): [number, number]
export function assertAuthoredTextures(result: GLTF): void
export function configureAuthoredLiveryLoader(loader: GLTFLoader): void

