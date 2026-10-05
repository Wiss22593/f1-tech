import type { GLTF } from 'three/addons/loaders/GLTFLoader.js'
export function acquireCar(path: string): { ready: Promise<GLTF>; release(): void }
