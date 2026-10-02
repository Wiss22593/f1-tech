export type ModelTeamId = 'mercedes' | 'ferrari' | 'mclaren' | 'red-bull-racing' | 'racing-bulls' | 'alpine' | 'haas' | 'audi' | 'williams' | 'aston-martin' | 'cadillac'
export interface TeamModelDefinition { readonly assetId: string; readonly path: `/models/${string}.glb`; readonly kind: 'custom' | 'fallback' }
export const bgrtModel: Readonly<TeamModelDefinition>
export const teamModelManifest: Readonly<Record<ModelTeamId, Readonly<TeamModelDefinition>>>
export function resolveTeamModel(teamId: string): Readonly<TeamModelDefinition>
