import type { CarComponentId, F1TechInspectionView } from './assets'
export const alpineAssetId: string
export const alpineInspectionViews: Partial<Record<CarComponentId, F1TechInspectionView>>
export function resolveAlpineFocus(componentId: CarComponentId | undefined, sourceName: string | null | undefined, available: readonly CarComponentId[]): CarComponentId | undefined
