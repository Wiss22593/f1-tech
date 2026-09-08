import { demoTechnicalUpdates } from '../../data/demo/technical'
import type { TechnicalArea, UpdateState } from '../../domain/technical'

export type UpdateStatus = UpdateState
export type TeamUpdate = (typeof demoTechnicalUpdates)[number]
export { type TechnicalArea }
export const updateStatuses: UpdateStatus[] = ['ANNOUNCED', 'SUBMITTED', 'TESTED', 'RUNNING', 'RACE_SPEC']
export const updateAreas: TechnicalArea[] = ['Aerodinámica', 'Refrigeración', 'Suspensión', 'Unidad de potencia', 'Frenos', 'Carrocería']
export const demoGrandPrix = {
  name: 'GRAN PREMIO DEMO',
  circuit: 'TRAZADO DE REFERENCIA · DEMO',
  timing: 'TECHNICAL PREVIEW · PRE-EVENTO',
  description: 'Una lectura previa para ordenar hipótesis de desarrollo antes de conectar fuentes verificadas.',
}

export const demoTeamUpdates = demoTechnicalUpdates
