import type { PublishedUpdate } from './published-dataset'
import type { Locale } from '../../i18n'

export type FiaPresentation = {
  componentName: string | null
  primaryReason: string | null
  geometricDifference: string | null
  briefDescription: string | null
  componentLabel: string
  summary: string
  complete: boolean
  missingFields: Array<'componentName' | 'primaryReason' | 'geometricDifference' | 'briefDescription'>
}
export function fiaLocalizationSourceKey(record: PublishedUpdate & { contentHash?: string }): string
export function localizeFiaUpdate(record: PublishedUpdate & { contentHash?: string }, locale: Locale): FiaPresentation
