import type { Group } from 'three'
import type { CarComponentId } from './assets'
export interface UniversalMapsManifest { format: string; maps: Record<string, { mesh_name: string }>; fia_aliases: Record<string, string> }
export const universalMapsPath: string
export const universalMapsManifestPath: string
export function loadUniversalMapsManifest(): Promise<UniversalMapsManifest>
export function resolveUniversalMap(componentId: CarComponentId | undefined, sourceName: string | null | undefined, manifest?: UniversalMapsManifest): string | null
export function createUniversalOverlay(scene: Group, color: string, manifest: UniversalMapsManifest): { model: Group; select(name?: string | null): void; setColor(color: string): void; snapshot(): { active: string | null; visible: string[] }; dispose(): void }
