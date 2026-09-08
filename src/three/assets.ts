export type CarComponentId = 'car' | 'chassis' | 'nose' | 'frontWing' | 'frontSuspension' | 'frontBrake' | 'floor' | 'sidepods' | 'cooling' | 'engineCover' | 'rearSuspension' | 'rearBrake' | 'rearWing' | 'diffuser' | 'wheels' | 'steeringWheel' | 'halo'
export type CameraPresetId = 'default' | 'front' | 'rear' | 'side' | 'top'

export interface F1TechInspectionView { position: [number, number, number]; target: [number, number, number]; duration?: number }
export interface F1TechHotspot { id: string; componentId: CarComponentId; label: string; position: [number, number, number]; calloutOffset: [number, number, number]; inspectionView: F1TechInspectionView; description: string }
export interface F1TechCarAsset { id: string; path: `/models/${string}.${'glb' | 'gltf'}`; version: string; scale: number; rotation: [number, number, number]; nodes: Partial<Record<CarComponentId, string>>; hotspots: F1TechHotspot[]; cameraPresets: Record<CameraPresetId, [number, number, number]>; materials?: Record<string, { label: string }>; beforeAsset?: string; afterAsset?: string; metadata: { author: string; license: 'F1 TECH Original' | 'Apache-2.0' | 'User-provided local evaluation'; createdAt: string } }

// Asset de evaluación explícitamente autorizado por el usuario. No procede de VRC,
// Formula Alpha ni Assetto Corsa y conserva la atribución del proyecto de origen.
export const carAssetRegistry: readonly F1TechCarAsset[] = [{
  id: 'bgrt-f1-concept-2026-evaluation', path: '/models/bgrt-f1-concept-2026.glb', version: 'evaluation', scale: 1.1, rotation: [0, 0, 0], nodes: {}, hotspots: [],
  cameraPresets: { default: [4.8, 2.75, 5.6], front: [0, 1.7, 6.9], rear: [0, 1.9, -6.9], side: [6.7, 2.15, 0], top: [0, 7.2, .35] },
  metadata: { author: 'BGRT-Studio', license: 'User-provided local evaluation', createdAt: '2026-09-08' },
}, {
  id: 'apex-formula-2026-evaluation', path: '/models/apex-formula-2026.glb', version: 'evaluation', scale: 1.15, rotation: [0, 0, 0], nodes: {}, hotspots: [],
  cameraPresets: { default: [4.8, 2.75, 5.6], front: [0, 1.7, 6.9], rear: [0, 1.9, -6.9], side: [6.7, 2.15, 0], top: [0, 7.2, .35] },
  metadata: { author: 'Apex Formula 2026', license: 'Apache-2.0', createdAt: '2026-09-08' },
}]
export const activeCarAsset = carAssetRegistry[0]
