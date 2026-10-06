import type { Box3, Material, Object3D } from 'three'
import type { CarComponentId } from './assets'
export type FocusId = CarComponentId | `MAP_${string}`
export const isolationBrightness: number
export const isolationDuration: number
export interface GeometryTarget { type: 'mesh' | 'group' | 'island'; node: string; meshName: string; meshUuid: string; primitive?: number; firstTriangle?: number; triangles: number; groupIndex?: number }
export interface ComponentIsolation {
  highlightable: FocusId[]
  universalBounds: Map<string, Box3>
  select(component?: string): void
  resolveTargets(component?: string): GeometryTarget[]
  step(delta: number): boolean
  snapshot(): { assetId: string; mode: 'normal' | 'external' | 'internal'; active: FocusId | null; highlightable: FocusId[]; materials: Array<{ component: FocusId | null; components: FocusId[]; gain: number; focusTint: number; haloContrast: number; uuid: string }>; targetCount: number; targets: Partial<Record<FocusId, GeometryTarget[]>>; cache: { hits: number; misses: number }; failures: { component: string; reason: string }[]; geometries: number; disposed: boolean }
  dispose(): void
}
export function createComponentIsolation(model: Object3D, assetId: string, cloneMaterial?: (material: Material) => Material, mapping?: unknown, universal?: { scene: Object3D; manifest: import('./universal-maps.mjs').UniversalMapsManifest }): ComponentIsolation
