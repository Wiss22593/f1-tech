import { calculateCircuitFit, calculateF1TechScore, type CircuitProfile, type TechnicalUpdate } from '../../domain/technical'

export const demoCircuit: CircuitProfile = { id: 'reference-circuit', name: 'Circuito de referencia', country: 'DEMO', source: 'F1 TECH Demo Provider', confidence: 'F1 TECH Analysis', demo: true, demands: { downforce: 8, efficiency: 7, braking: 6, traction: 8, tyreManagement: 6, cornering: 9, kerbs: 5, cooling: 6, technicalComplexity: 9 } }

const source = { source: 'F1 TECH Demo Provider', confidence: 'F1 TECH Analysis' as const, demo: true }
export const demoTechnicalUpdates: TechnicalUpdate[] = [
  { id: 'demo-mer-floor', teamId: 'mercedes', team: 'Mercedes', race: 'Gran Premio DEMO', state: 'SUBMITTED', quantity: 1, magnitude: 'Alta', area: 'Aerodinámica', component: 'Plataforma inferior', objective: 'Evaluar estabilidad de plataforma', before: 'Referencia DEMO', after: 'Configuración DEMO', expectedImpact: 'Hipótesis de carga', f1TechScore: 82, circuitFit: 79, ...source },
  { id: 'demo-fer-wing', teamId: 'ferrari', team: 'Ferrari', race: 'Gran Premio DEMO', state: 'TESTED', quantity: 1, magnitude: 'Media', area: 'Aerodinámica', component: 'Conjunto delantero', objective: 'Analizar ventana de balance', expectedImpact: 'Hipótesis de balance', f1TechScore: 76, circuitFit: 74, ...source },
  { id: 'demo-mcl-cooling', teamId: 'mclaren', team: 'McLaren', race: 'Gran Premio DEMO', state: 'RUNNING', quantity: 1, magnitude: 'Baja', area: 'Refrigeración', component: 'Conductos laterales', objective: 'Observar eficiencia térmica', expectedImpact: 'Hipótesis térmica', f1TechScore: 72, circuitFit: 75, ...source },
  { id: 'demo-rbr-diffuser', teamId: 'red-bull-racing', team: 'Red Bull', race: 'Gran Premio DEMO', state: 'RACE_SPEC', quantity: 1, magnitude: 'Media', area: 'Aerodinámica', component: 'Zona trasera', objective: 'Explorar carga a baja altura', expectedImpact: 'Hipótesis de carga', f1TechScore: 80, circuitFit: 77, ...source },
  { id: 'demo-ast-suspension', teamId: 'aston-martin', team: 'Aston Martin', race: 'Gran Premio DEMO', state: 'ANNOUNCED', quantity: 1, magnitude: 'Media', area: 'Suspensión', component: 'Arquitectura trasera', objective: 'Preparar evaluación de plataforma', expectedImpact: 'Hipótesis mecánica', f1TechScore: 70, circuitFit: 73, ...source },
]

export const demoScore = calculateF1TechScore({ aerodynamics: 80, magnitude: 68, circuitFit: calculateCircuitFit(demoCircuit.demands, { downforce: 76, efficiency: 72, braking: 65, traction: 73, tyreManagement: 68, cornering: 80, kerbs: 60, cooling: 66, technicalComplexity: 77 }), developmentRate: 74, confidence: 55 })
