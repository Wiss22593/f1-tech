export type CarComponentId = 'car' | 'chassis' | 'nose' | 'frontWing' | 'frontSuspension' | 'frontBrake' | 'floor' | 'sidepods' | 'cooling' | 'engineCover' | 'rearSuspension' | 'rearBrake' | 'rearWing' | 'diffuser' | 'wheels' | 'steeringWheel' | 'halo'
export type CameraPresetId = 'default' | 'front' | 'rear' | 'side' | 'top'

export interface F1TechHotspot { id: string; componentId: CarComponentId; label: string; position: [number, number, number]; description: string }
export interface F1TechCarAsset { id: string; path: `/models/${string}.${'glb' | 'gltf'}`; version: string; scale: number; rotation: [number, number, number]; nodes: Partial<Record<CarComponentId, string>>; hotspots: F1TechHotspot[]; cameraPresets: Record<CameraPresetId, [number, number, number]>; materials?: Record<string, { label: string }>; metadata: { author: string; license: 'F1 TECH Original'; createdAt: string } }

// El registry se mantiene vacío hasta incorporar un modelo ORIGINAL de F1 TECH.
// Nunca registrar assets de Formula Alpha, VRC, Assetto Corsa ni otros terceros.
export const carAssetRegistry: readonly F1TechCarAsset[] = []
export const activeCarAsset = carAssetRegistry[0]
