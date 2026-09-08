export type UpdateStatus = 'Submitted' | 'Tested' | 'Race Spec' | 'Test Item'

export type TechnicalUpdate = {
  team: string
  component: string
  status: UpdateStatus
  objective: string
  magnitude: 'Baja' | 'Media' | 'Alta'
  source: string
  confidence: number
}

export const demoTeams = [
  'Mercedes', 'Ferrari', 'McLaren', 'Red Bull', 'Racing Bulls', 'Alpine', 'Haas', 'Audi', 'Williams', 'Aston Martin', 'Cadillac',
].map((team, index) => ({ team, updates: [3, 1, 4, 2, 0, 2, 5, 1, 3, 2, 1][index] }))

export const demoUpdates: TechnicalUpdate[] = [
  { team: 'Mercedes', component: 'Plataforma inferior', status: 'Submitted', objective: 'Evaluar estabilidad de plataforma', magnitude: 'Alta', source: 'DEMO Provider', confidence: 55 },
  { team: 'Ferrari', component: 'Conjunto delantero', status: 'Tested', objective: 'Analizar ventana de balance', magnitude: 'Media', source: 'DEMO Provider', confidence: 55 },
  { team: 'McLaren', component: 'Refrigeración', status: 'Test Item', objective: 'Observar eficiencia térmica', magnitude: 'Baja', source: 'DEMO Provider', confidence: 55 },
  { team: 'Red Bull', component: 'Zona trasera', status: 'Race Spec', objective: 'Explorar carga a baja altura', magnitude: 'Media', source: 'DEMO Provider', confidence: 55 },
]

export const demoScores = [
  { label: 'Aerodynamics', value: 84 },
  { label: 'Magnitude', value: 72 },
  { label: 'Circuit Fit', value: 88 },
  { label: 'Development Rate', value: 76 },
  { label: 'Confidence', value: 55 },
]
