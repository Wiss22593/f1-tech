import type { Object3D } from 'three'
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js'
import type { OptimizedCarDiagnostics } from './optimized-car-loader.mjs'
export type CarLease = { ready: Promise<GLTF>; release(): void }
export function acquireCar(path: string, load?: (path: string) => Promise<GLTF>): CarLease
export function acquireOriginalCar(path: string, load?: (path: string) => Promise<GLTF>): CarLease
export function disposeCarScene(scene: Object3D): void
export function getOptimizedCarDiagnostics(): OptimizedCarDiagnostics
