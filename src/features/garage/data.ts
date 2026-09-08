import { demoTechnicalUpdates } from '../../data/demo/technical'
import { teams } from '../teams/data'
import type { CarComponentId, F1TechHotspot } from '../../three/assets'

export interface GarageGrandPrix { id: string; name: string; circuit: string }
export interface TeamTheme { primary: string; accent: string; surface: string }
export interface GarageUpdate {
  id: string; teamId: string; grandPrixId: string; componentId: CarComponentId; status: string; objective: string
  magnitude: string; source: string; confidence: string; description: string; analysis: string; score: number; circuitFit: number
}

export const garageGrandPrix: GarageGrandPrix[] = [{ id: 'demo-grand-prix', name: 'GRAN PREMIO DEMO', circuit: 'TRAZADO DE REFERENCIA · DEMO' }]

// Paletas abstractas de F1 TECH: no son liveries, logos ni identificadores oficiales.
const themePalette: TeamTheme[] = [
  { primary: '#57c8bb', accent: '#e4fcf7', surface: '#173636' }, { primary: '#e65350', accent: '#ffd2cd', surface: '#421d20' },
  { primary: '#ed9b39', accent: '#ffe2b6', surface: '#412918' }, { primary: '#5d7fff', accent: '#dce4ff', surface: '#20284d' },
  { primary: '#7182ad', accent: '#d7dcf0', surface: '#252b3e' }, { primary: '#e05ca9', accent: '#ffd6eb', surface: '#482039' },
  { primary: '#4377e8', accent: '#d6e4ff', surface: '#1d2c56' }, { primary: '#b6b8be', accent: '#ffffff', surface: '#35363a' },
  { primary: '#48a9d7', accent: '#d7f2ff', surface: '#183647' }, { primary: '#4fae70', accent: '#d9ffe5', surface: '#193827' }, { primary: '#d8a944', accent: '#fff0c8', surface: '#413219' },
]

export const garageTeams = teams.map((team, index) => ({ ...team, name: team.id === 'red-bull-racing' ? 'Red Bull' : team.name, theme: themePalette[index] }))

const componentByUpdateId: Record<string, CarComponentId> = {
  'demo-mer-floor': 'floor', 'demo-fer-wing': 'frontWing', 'demo-mcl-cooling': 'cooling', 'demo-rbr-diffuser': 'diffuser', 'demo-ast-suspension': 'rearSuspension',
}

export const garageUpdates: GarageUpdate[] = demoTechnicalUpdates.map((update) => ({
  id: update.id, teamId: update.teamId, grandPrixId: 'demo-grand-prix', componentId: componentByUpdateId[update.id], status: update.state,
  objective: update.objective, magnitude: update.magnitude, source: update.source, confidence: update.confidence,
  description: update.after ?? update.expectedImpact ?? 'Configuración DEMO en evaluación.',
  analysis: 'DEMO · Lectura preliminar de F1 TECH. No representa información técnica verificada ni oficial.',
  score: update.f1TechScore ?? 0, circuitFit: update.circuitFit ?? 0,
}))

export const garageHotspots: F1TechHotspot[] = [
  { id: 'frontWing', componentId: 'frontWing', label: 'Alerón delantero', position: [0, .32, 2.72], calloutOffset: [0, .45, .55], inspectionView: { position: [3.2, 2.4, 5.8], target: [0, .38, 2.35], duration: 760 }, description: 'Aerodynamics' },
  { id: 'nose', componentId: 'nose', label: 'Nariz', position: [0, .63, 1.85], calloutOffset: [.62, .38, .32], inspectionView: { position: [3, 2.25, 4.9], target: [0, .65, 1.7], duration: 740 }, description: 'Body' },
  { id: 'frontSuspension', componentId: 'frontSuspension', label: 'Suspensión delantera', position: [-.92, .46, 1.13], calloutOffset: [-.58, .43, .26], inspectionView: { position: [-3.5, 1.6, 3.8], target: [-.82, .48, 1.15], duration: 780 }, description: 'Mechanical' },
  { id: 'frontBrake', componentId: 'frontBrake', label: 'Frenos', position: [1.2, .44, 1.23], calloutOffset: [.5, .4, .2], inspectionView: { position: [3.5, 1.4, 3], target: [1.08, .46, 1.2], duration: 760 }, description: 'Mechanical' },
  { id: 'wheels', componentId: 'wheels', label: 'Ruedas / Neumáticos', position: [-1.28, .58, -1.43], calloutOffset: [-.5, .45, -.28], inspectionView: { position: [-3.7, 1.7, 1.8], target: [-1.18, .52, -1.1], duration: 780 }, description: 'Mechanical' },
  { id: 'floor', componentId: 'floor', label: 'Piso', position: [-.85, .12, -.15], calloutOffset: [-.62, -.2, .28], inspectionView: { position: [3.2, -3.2, 3.6], target: [0, .12, -.2], duration: 940 }, description: 'Aerodynamics' },
  { id: 'sidepods', componentId: 'sidepods', label: 'Pontones', position: [1.06, .68, -.25], calloutOffset: [.72, .3, .16], inspectionView: { position: [4.2, 2.25, .5], target: [1, .7, -.12], duration: 760 }, description: 'Aerodynamics' },
  { id: 'cooling', componentId: 'cooling', label: 'Refrigeración', position: [1.14, .72, -.38], calloutOffset: [.64, .42, -.08], inspectionView: { position: [4.15, 2, .1], target: [1.08, .75, -.38], duration: 760 }, description: 'Cooling' },
  { id: 'cockpit', componentId: 'chassis', label: 'Cockpit', position: [0, 1.02, .2], calloutOffset: [.55, .4, .18], inspectionView: { position: [3, 3.25, 3.35], target: [0, 1.08, .2], duration: 720 }, description: 'Body' },
  { id: 'halo', componentId: 'halo', label: 'Halo', position: [-.4, 1.12, .2], calloutOffset: [-.56, .42, .12], inspectionView: { position: [-2.6, 3.45, 3.2], target: [-.2, 1.18, .15], duration: 720 }, description: 'Safety' },
  { id: 'engineCover', componentId: 'engineCover', label: 'Cubierta del motor', position: [0, 1.38, -.92], calloutOffset: [.58, .44, -.2], inspectionView: { position: [3, 3.1, -3.5], target: [0, 1.22, -.9], duration: 780 }, description: 'Body' },
  { id: 'airbox', componentId: 'engineCover', label: 'Caja de aire', position: [0, 1.45, -.92], calloutOffset: [.28, .54, -.25], inspectionView: { position: [2.3, 4, -3], target: [0, 1.42, -.92], duration: 760 }, description: 'Cooling' },
  { id: 'rearSuspension', componentId: 'rearSuspension', label: 'Suspensión trasera', position: [-1.0, .58, -1.35], calloutOffset: [-.52, .42, -.18], inspectionView: { position: [-3.6, 2, -3.8], target: [-.9, .58, -1.35], duration: 800 }, description: 'Mechanical' },
  { id: 'rearBrake', componentId: 'rearBrake', label: 'Frenos traseros', position: [1.26, .5, -1.43], calloutOffset: [.48, .38, -.16], inspectionView: { position: [3.6, 1.5, -3.2], target: [1.18, .5, -1.42], duration: 780 }, description: 'Mechanical' },
  { id: 'rearWing', componentId: 'rearWing', label: 'Alerón trasero', position: [0, 1.6, -2.18], calloutOffset: [0, .62, -.34], inspectionView: { position: [3, 2.6, -5.3], target: [0, 1.45, -2.1], duration: 860 }, description: 'Aerodynamics' },
  { id: 'diffuser', componentId: 'diffuser', label: 'Difusor', position: [0, .15, -2.35], calloutOffset: [.5, .12, -.42], inspectionView: { position: [3, -1.2, -4.5], target: [0, .18, -2.1], duration: 860 }, description: 'Aerodynamics' },
]

export function getGarageUpdates(teamId: string, grandPrixId: string) {
  return garageUpdates.filter((update) => update.teamId === teamId && update.grandPrixId === grandPrixId)
}
