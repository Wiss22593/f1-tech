import type { Material, Object3D } from 'three'
import type { CarComponentId } from './assets'
export const isolationBrightness: number
export const isolationDuration: number
export interface GeometryTarget { type: 'mesh' | 'group' | 'island'; node: string; meshName: string; meshUuid: string; primitive?: number; firstTriangle?: number; triangles: number; groupIndex?: number }
export interface ComponentIsolation {
  highlightable: CarComponentId[]
  select(component?: CarComponentId): void
  resolveTargets(component?: CarComponentId): GeometryTarget[]
  step(delta: number): boolean
  snapshot(): { assetId: string; mode: 'normal' | 'external' | 'internal'; active: CarComponentId | null; highlightable: CarComponentId[]; materials: Array<{ component: CarComponentId | null; components: CarComponentId[]; gain: number; focusTint: number; haloContrast: number; uuid: string }>; targetCount: number; targets: Partial<Record<CarComponentId, GeometryTarget[]>>; cache: { hits: number; misses: number }; failures: { component: string; reason: string }[]; geometries: number; disposed: boolean }
  dispose(): void
}
export function createComponentIsolation(model: Object3D, assetId: string, cloneMaterial?: (material: Material) => Material): ComponentIsolation
