import type { Material, Object3D } from 'three'
import type { CarComponentId } from './assets'
export const isolationBrightness: number
export const isolationDuration: number
export interface ComponentIsolation {
  highlightable: CarComponentId[]
  select(component?: CarComponentId): void
  step(delta: number): boolean
  snapshot(): { assetId: string; active: CarComponentId | null; highlightable: CarComponentId[]; materials: Array<{ component: CarComponentId | null; gain: number; uuid: string }>; geometries: number; disposed: boolean }
  dispose(): void
}
export function createComponentIsolation(model: Object3D, assetId: string, cloneMaterial?: (material: Material) => Material): ComponentIsolation
