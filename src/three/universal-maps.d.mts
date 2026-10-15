import type { Box3, Matrix4, Object3D } from 'three'
import type { CarComponentId, F1TechInspectionView } from './assets'
export interface UniversalMapsManifest { format: string; maps: Record<string, { mesh_name: string }>; fia_aliases: Record<string, string>; maps_exported?: string[] }
export const universalMapsPath: string
export const universalMapsManifestPath: string
export function normalizeUniversalManifest(manifest: UniversalMapsManifest): UniversalMapsManifest
export function loadUniversalMapsManifest(): Promise<UniversalMapsManifest>
export function resolveUniversalMap(componentId: CarComponentId | undefined, sourceName: string | null | undefined, manifest?: UniversalMapsManifest): string | null
export function universalSurfaceMasks(model: Object3D, scene: Object3D, manifest: UniversalMapsManifest): { masks: Map<Object3D, Map<number, Set<string>>>; bounds: Map<string, Box3>; valid: Set<string>; missing: string[] }
export function universalInspectionView(name: string, bounds: Box3, matrix: Matrix4, aspect?: number): F1TechInspectionView

export const universalCameraPresets: Record<string, { direction: [number, number, number]; padding: number; duration: number }>
