// Model selection depends only on the team. Keep logical asset IDs stable:
// Component Focus uses Alpine's existing ID independently of the GLB filename.
export const bgrtModel = Object.freeze({ assetId: 'bgrt-f1-concept-2026-evaluation', path: '/models/bgrt-f1-concept-2026.glb', kind: 'fallback' })
export const teamModelManifest = Object.freeze({
  mercedes: Object.freeze({ assetId: 'mercedes-w17-antonelli-evaluation', path: '/models/mercedes-w17-antonelli.glb', kind: 'custom' }),
  ferrari: bgrtModel,
  mclaren: bgrtModel,
  'red-bull-racing': bgrtModel,
  'racing-bulls': bgrtModel,
  alpine: Object.freeze({ assetId: 'alpine-a526-formulatech-evaluation', path: '/models/alpine-a526-colapinto.glb', kind: 'custom' }),
  haas: bgrtModel,
  audi: bgrtModel,
  williams: bgrtModel,
  'aston-martin': bgrtModel,
  cadillac: bgrtModel,
})
export function resolveTeamModel(teamId) {
  return Object.hasOwn(teamModelManifest, teamId) ? teamModelManifest[teamId] : bgrtModel
}
