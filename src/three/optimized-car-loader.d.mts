import type { GLTF } from 'three/addons/loaders/GLTFLoader.js'
import type { Material, Texture } from 'three'
export type CarLease = { ready: Promise<GLTF>; release(): void }
export interface OptimizedCarDiagnostics {
  readonly baseLoads: number
  readonly skinLoads: number
  readonly skinCacheHits: number
  readonly carCacheHits: number
  readonly cancelledLoads: number
  readonly fallbacks: number
  readonly fallbackReasons: Readonly<Record<string, number>>
  readonly uvPatchLoads: number
  readonly evictions: Readonly<{ bases: number; skins: number; cars: number; variants: number }>
  readonly disposed: Readonly<{ geometries: number; materials: number; textures: number }>
  readonly activeCars: number
  readonly bases: readonly Readonly<{ path: string; refs: number; loaded: boolean; variants: number; geometries: number }>[]
  readonly skins: readonly Readonly<{ path: string; driverId: string; refs: number; loaded: boolean }>[]
  readonly queuedSkins: number
  readonly skinLoadsInFlight: number
  readonly maxCachedSkins: number
  readonly baseIdleMs: number
}
export interface OptimizedDriver {
  teamId: string
  driverId: string
  basePath: string
  skinPath: string
  atlasPath?: string
  uvPatch?: { path: string; meshIndex: number; primitiveIndex: number; attribute: string; count: number; componentType: number; sha256: string }
}
export interface OptimizedManifest {
  version: number
  base: { textureRemap: (number | null)[]; atlasMaterialIndices: number[] }
  drivers: Record<string, OptimizedDriver>
}
export interface SkinResources {
  materials: Set<Material>
  textures: Set<Texture>
}
export function createOptimizedCarLoader(options: {
  manifest: OptimizedManifest
  acquireOriginal(path: string): CarLease
  loadBase?: (path: string, signal: AbortSignal) => Promise<GLTF>
  loadSkin?: (base: GLTF, driver: OptimizedDriver, manifest: OptimizedManifest, signal: AbortSignal) => Promise<{ materials: Material[]; resources: SkinResources }>
  loadUVPatch?: (path: string, signal: AbortSignal) => Promise<ArrayBuffer>
  setTimer?: typeof setTimeout
  clearTimer?: typeof clearTimeout
  now?: () => number
  idleMs?: number
  maxSkins?: number
}): { acquire(path: string): CarLease; diagnostics(): OptimizedCarDiagnostics }


export function withDriverAtlasBlob<T>(options: {
  skin: { images: { uri?: string; mimeType?: string; bufferView?: number }[]; textures: { source: number }[]; [key: string]: unknown }
  driver: { skinPath: string; atlasPath: string }
  manifest: { base: { textureRemap: (number | null)[] } }
  signal?: AbortSignal
  fetchAsset?: typeof fetch
  objectURLs?: { createObjectURL(object: Blob): string; revokeObjectURL(url: string): void }
}, decode: (skin: unknown) => Promise<T>): Promise<T>
