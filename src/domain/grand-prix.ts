export type PublicationState = 'draft' | 'validated' | 'published' | 'manual_review' | 'error'
export type TechnicalState = 'ANNOUNCED' | 'SUBMITTED' | 'TESTED' | 'RUNNING' | 'RACE_SPEC'
export type StableComponentId = 'front-wing' | 'nose' | 'floor' | 'diffuser' | 'rear-wing' | 'sidepods' | 'cooling' | 'engine-cover' | 'airbox' | 'cockpit' | 'halo' | 'front-suspension' | 'rear-suspension' | 'brakes' | 'wheels-tyres'
export interface GrandPrix {
  id: string; season: number; name: string; country: string; city?: string; circuit: string
  startDate: string | null; endDate: string | null; status: 'scheduled' | 'completed' | 'pending'
  sourceMetadata?: { source: string; retrievedAt?: string }
}
export interface TeamWeekendData { grandPrixId: string; teamId: string; updates: readonly TechnicalUpdateRecord[] }
export interface TechnicalUpdateRecord {
  id: string; grandPrixId: string; teamId: string; componentId: StableComponentId | null; visualizable?: boolean; category: string | null
  componentName?: string | null; primaryReason?: string | null; geometricDifference?: string | null; briefDescription?: string | null
  source: string; sourceDocument: string; sourceText: string; sourceLanguage: string
  translations: Partial<Record<'es' | 'en' | 'it' | 'pt' | 'fr' | 'de', string>>
  description: string | null; area: string | null; objective: string | null; magnitude: string | null
  technicalState: TechnicalState; validationState: PublicationState; publishedAt: string | null
}
export const threeComponentToStableId: Record<string, StableComponentId> = { frontWing: 'front-wing', nose: 'nose', floor: 'floor', diffuser: 'diffuser', rearWing: 'rear-wing', sidepods: 'sidepods', cooling: 'cooling', engineCover: 'engine-cover', chassis: 'cockpit', halo: 'halo', frontSuspension: 'front-suspension', rearSuspension: 'rear-suspension', frontBrake: 'brakes', rearBrake: 'brakes', wheels: 'wheels-tyres' }
