export type UpdateState = 'ANNOUNCED' | 'SUBMITTED' | 'TESTED' | 'RUNNING' | 'RACE_SPEC'
export type ConfidenceLevel = 'Confirmed' | 'Reported' | 'F1 TECH Analysis'
export type TechnicalArea = 'Aerodinámica' | 'Refrigeración' | 'Suspensión' | 'Unidad de potencia' | 'Frenos' | 'Carrocería'
export type Magnitude = 'Baja' | 'Media' | 'Alta'

export type SourceTrace = { source: string; sourceUrl?: string; confidence: ConfidenceLevel; verifiedAt?: string; demo: boolean }

export interface TechnicalUpdate extends SourceTrace {
  id: string; teamId: string; team: string; race: string; state: UpdateState; quantity: number; magnitude: Magnitude; area: TechnicalArea; component: string; objective: string; before?: string; after?: string; expectedImpact?: string; f1TechScore?: number; circuitFit?: number
}

export interface CircuitProfile extends SourceTrace {
  id: string; name: string; country: string; demands: { downforce: number; efficiency: number; braking: number; traction: number; tyreManagement: number; cornering: number; kerbs: number; cooling: number; technicalComplexity: number }
}

export interface ScoreInputs { aerodynamics: number; magnitude: number; circuitFit: number; developmentRate: number; confidence: number }
export const calculateF1TechScore = (inputs: ScoreInputs) => Math.round(inputs.aerodynamics * .3 + inputs.magnitude * .2 + inputs.circuitFit * .2 + inputs.developmentRate * .15 + inputs.confidence * .15)
export const calculateCircuitFit = (demands: CircuitProfile['demands'], strengths: Partial<CircuitProfile['demands']>) => {
  const keys = Object.keys(demands) as (keyof CircuitProfile['demands'])[]
  const total = keys.reduce((sum, key) => sum + (strengths[key] ?? 50) * demands[key], 0)
  const weight = keys.reduce((sum, key) => sum + demands[key], 0)
  return Math.round(total / weight)
}
