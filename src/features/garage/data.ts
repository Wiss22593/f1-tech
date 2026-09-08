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
  { id: 'frontWing', componentId: 'frontWing', label: 'Front Wing', position: [0, .32, 2.72], description: 'Aerodynamics' },
  { id: 'nose', componentId: 'nose', label: 'Nose', position: [0, .63, 1.85], description: 'Body' },
  { id: 'frontSuspension', componentId: 'frontSuspension', label: 'Suspension', position: [-.92, .46, 1.13], description: 'Mechanical' },
  { id: 'frontBrake', componentId: 'frontBrake', label: 'Brakes', position: [1.2, .44, 1.23], description: 'Mechanical' },
  { id: 'wheels', componentId: 'wheels', label: 'Wheels / Tyres', position: [-1.28, .58, -1.35], description: 'Mechanical' },
  { id: 'floor', componentId: 'floor', label: 'Floor', position: [-.85, .1, -.15], description: 'Aerodynamics' },
  { id: 'sidepods', componentId: 'sidepods', label: 'Sidepods', position: [1.06, .68, -.25], description: 'Aerodynamics' },
  { id: 'cooling', componentId: 'cooling', label: 'Cooling', position: [1.12, .74, -.38], description: 'Cooling' },
  { id: 'engineCover', componentId: 'engineCover', label: 'Engine Cover', position: [0, 1.38, -.92], description: 'Body' },
  { id: 'rearWing', componentId: 'rearWing', label: 'Rear Wing', position: [0, 1.6, -2.18], description: 'Aerodynamics' },
  { id: 'diffuser', componentId: 'diffuser', label: 'Diffuser', position: [0, .15, -2.35], description: 'Aerodynamics' },
]

export function getGarageUpdates(teamId: string, grandPrixId: string) {
  return garageUpdates.filter((update) => update.teamId === teamId && update.grandPrixId === grandPrixId)
}
