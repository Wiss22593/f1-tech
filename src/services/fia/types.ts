import type { Locale } from '../../i18n'
import type { CarComponentId } from '../../three/assets'

export type IngestionStatus = 'draft' | 'validated' | 'published' | 'manual_review' | 'error'

export interface FiaDocumentRecord {
  id: string
  sourceUrl: string
  sourceDocument: string
  documentNumber?: string
  documentDate?: string
  retrievedAt: string
  hash: string
  parserVersion: string
  ingestionStatus: IngestionStatus
}

export interface NormalizedCarPresentation extends FiaDocumentRecord {
  season: number
  grandPrixId: string
  teamId: string
  componentId: CarComponentId | null
  visualizable: boolean
  sourceTextOriginal: string
  translations: Partial<Record<Exclude<Locale, 'en'>, string>>
  area?: string
  objective?: string
  magnitude?: string
}

/** Server-side contract only: React must consume published structured records. */
export interface FiaDocumentProvider {
  findDocuments(grandPrixId: string): Promise<readonly FiaDocumentRecord[]>
  normalize(document: FiaDocumentRecord): Promise<readonly NormalizedCarPresentation[]>
}
