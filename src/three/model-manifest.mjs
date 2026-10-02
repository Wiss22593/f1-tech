// Model selection depends only on the team. Keep logical asset IDs stable:
// Component Focus uses Alpine's existing ID independently of the GLB filename.
export const bgrtModel = Object.freeze({ assetId: 'bgrt-f1-concept-2026-evaluation', path: '/models/bgrt-f1-concept-2026.glb', kind: 'fallback' })
export const teamModelManifest = Object.freeze({
  mercedes: Object.freeze({ assetId: 'mercedes-w17-antonelli-evaluation', path: '/models/mercedes-w17-antonelli.glb', kind: 'custom' }),
  ferrari: Object.freeze({ assetId: 'ferrari-sf26-leclerc-evaluation', path: '/models/ferrari-sf26-leclerc.glb', kind: 'custom' }),
  mclaren: Object.freeze({ assetId: 'mclaren-mcl40-norris-evaluation', path: '/models/mclaren-mcl40-norris.glb', kind: 'custom' }),
  'red-bull-racing': Object.freeze({ assetId: 'red-bull-rb22-verstappen-evaluation', path: '/models/red-bull-rb22-verstappen.glb', kind: 'custom' }),
  'racing-bulls': Object.freeze({ assetId: 'racing-bulls-vcarb03-lindblad-evaluation', path: '/models/racing-bulls-vcarb03-lindblad.glb', kind: 'custom' }),
  alpine: Object.freeze({ assetId: 'alpine-a526-formulatech-evaluation', path: '/models/alpine-a526-colapinto.glb', kind: 'custom' }),
  haas: Object.freeze({ assetId: 'haas-vf26-bearman-evaluation', path: '/models/haas-vf26-bearman.glb', kind: 'custom' }),
  audi: Object.freeze({ assetId: 'audi-r26-bortoleto-evaluation', path: '/models/audi-r26-bortoleto.glb', kind: 'custom' }),
  williams: Object.freeze({ assetId: 'williams-fw48-albon-evaluation', path: '/models/williams-fw48-albon.glb', kind: 'custom' }),
  'aston-martin': Object.freeze({ assetId: 'aston-martin-amr26-alonso-evaluation', path: '/models/aston-martin-amr26-alonso.glb', kind: 'custom' }),
  cadillac: Object.freeze({ assetId: 'cadillac-mac26-perez-evaluation', path: '/models/cadillac-mac26-perez.glb', kind: 'custom' }),
})
export function resolveTeamModel(teamId) {
  return Object.hasOwn(teamModelManifest, teamId) ? teamModelManifest[teamId] : bgrtModel
}
