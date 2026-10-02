import { bgrtModel, resolveTeamModel, teamModelManifest } from './model-manifest.mjs'

export type CarComponentId = 'car' | 'chassis' | 'nose' | 'frontWing' | 'frontSuspension' | 'frontBrake' | 'floor' | 'sidepods' | 'cooling' | 'engineCover' | 'rearSuspension' | 'rearBrake' | 'rearWing' | 'diffuser' | 'wheels' | 'steeringWheel' | 'halo' | 'mirrors' | 'frontCorner' | 'rearCorner' | 'frontWheels' | 'rearWheels' | 'onboardCamera'
export type CameraPresetId = 'default' | 'front' | 'rear' | 'side' | 'top'

export interface F1TechInspectionView { position: [number, number, number]; target: [number, number, number]; duration?: number }
export interface F1TechHotspot { id: string; componentId: CarComponentId; label: string; position: [number, number, number]; calloutOffset: [number, number, number]; inspectionView: F1TechInspectionView; description: string }
export interface ModelDefinition { id: string; path: `/models/${string}.${'glb' | 'gltf'}`; license: 'F1 TECH Original' | 'Apache-2.0' | 'User-provided local evaluation'; attribution: string; redistributable: boolean; editable: boolean }
export interface F1TechCarAsset extends ModelDefinition { version: string; scale: number; rotation: [number, number, number]; liveryMode: 'team-theme' | 'authored'; nodes: Partial<Record<CarComponentId, string>>; hotspots: F1TechHotspot[]; cameraPresets: Record<CameraPresetId, [number, number, number]>; materials?: Record<string, { label: string }>; beforeAsset?: string; afterAsset?: string; metadata: { author: string; license: ModelDefinition['license']; createdAt: string } }

// Asset de evaluación explícitamente autorizado por el usuario. No procede de VRC,
// Formula Alpha ni Assetto Corsa y conserva la atribución del proyecto de origen.
const bgrtCarAsset: F1TechCarAsset = {
  id: bgrtModel.assetId, path: bgrtModel.path, license: 'User-provided local evaluation', version: 'evaluation', scale: 1.1, rotation: [0, 0, 0], liveryMode: 'team-theme', nodes: {}, hotspots: [], attribution: 'BGRT-Studio; user-provided local evaluation asset', redistributable: false, editable: false,
  cameraPresets: { default: [4.8, 2.75, 5.6], front: [0, 1.7, 6.9], rear: [0, 1.9, -6.9], side: [6.7, 2.15, 0], top: [0, 7.2, .35] },
  metadata: { author: 'BGRT-Studio', license: 'User-provided local evaluation', createdAt: '2026-09-08' },
}
const alpineCarAsset: F1TechCarAsset = {
  id: teamModelManifest.alpine.assetId, path: teamModelManifest.alpine.path, license: 'User-provided local evaluation', version: 'evaluation', scale: 1.1, rotation: [0, 0, 0], liveryMode: 'authored', nodes: {}, hotspots: [], attribution: 'BGRT-Studio; user-provided Alpine A526 derivative for local evaluation', redistributable: false, editable: false,
  cameraPresets: { default: [4.8, 2.75, 5.6], front: [0, 1.7, 6.9], rear: [0, 1.9, -6.9], side: [6.7, 2.15, 0], top: [0, 7.2, .35] },
  metadata: { author: 'User-provided Alpine A526 derivative', license: 'User-provided local evaluation', createdAt: '2026-09-11' },
}
const mercedesCarAsset: F1TechCarAsset = {
  id: teamModelManifest.mercedes.assetId, path: teamModelManifest.mercedes.path, license: 'User-provided local evaluation', version: 'evaluation', scale: 1.1, rotation: [0, 0, 0], liveryMode: 'authored', nodes: {}, hotspots: [], attribution: 'User-provided Mercedes W17 Antonelli for local evaluation', redistributable: false, editable: false,
  cameraPresets: { default: [4.8, 2.75, 5.6], front: [0, 1.7, 6.9], rear: [0, 1.9, -6.9], side: [6.7, 2.15, 0], top: [0, 7.2, .35] },
  metadata: { author: 'User-provided Mercedes W17 Antonelli', license: 'User-provided local evaluation', createdAt: '2026-10-02' },
}

const additionalTeamAssets: F1TechCarAsset[] = Object.entries(teamModelManifest)
  .filter(([teamId]) => teamId !== 'alpine' && teamId !== 'mercedes')
  .map(([teamId, model]) => ({
    ...mercedesCarAsset,
    id: model.assetId,
    path: model.path,
    attribution: `User-provided ${teamId} for local evaluation`,
    metadata: { ...mercedesCarAsset.metadata, author: `User-provided ${teamId}` },
  }))
export const carAssetRegistry: readonly F1TechCarAsset[] = [bgrtCarAsset, alpineCarAsset, mercedesCarAsset, ...additionalTeamAssets]
const assetsById = new Map(carAssetRegistry.map(asset => [asset.id, asset]))
export function getCarAssetForTeam(teamId: string): F1TechCarAsset {
  const model = resolveTeamModel(teamId)
  const asset = assetsById.get(model.assetId)
  if (!asset) throw new Error(`Unregistered team model: ${model.assetId}`)
  return asset
}
