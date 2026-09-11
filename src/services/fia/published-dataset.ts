import type { CarComponentId } from '../../three/assets'
import { grandsPrix2026 } from '../../data/grands-prix/2026'

export interface PublishedUpdate {
  id: string; grandPrixId: string; teamId: string; componentId: string | null; visualizable?: boolean
  componentName?: string | null; primaryReason?: string | null; geometricDifference?: string | null; briefDescription?: string | null
  category: string | null; source: 'FIA'; sourceUrl: string; sourceDocument: string; sourceText: string; sourceLanguage: string
  translations: Record<string, string>; description: string | null; area: string | null; objective: string | null; magnitude: string | null
  technicalState: 'ANNOUNCED' | 'SUBMITTED' | 'TESTED' | 'RUNNING' | 'RACE_SPEC'; validationState: 'published'; publishedAt: string
}
export interface PublishedGrandPrixDataset { schemaVersion: string; grandPrix: { id: string; name: string; circuit: string | null }; season: number; teams: string[]; updates: PublishedUpdate[]; publishedAt: string }
export type DatasetResult = { dataset: PublishedGrandPrixDataset | null; stale: boolean; error: Error | null }
export type PublishedSeasonResult = { updates: PublishedUpdate[]; stale: boolean; errors: Error[] }

const retainedDatasets = new Map<string, PublishedGrandPrixDataset>()
const stableToCarComponent: Record<string, CarComponentId> = {
  'front-wing': 'frontWing', nose: 'nose', floor: 'floor', diffuser: 'diffuser', 'rear-wing': 'rearWing', sidepods: 'sidepods', cooling: 'cooling', 'engine-cover': 'engineCover', airbox: 'engineCover', cockpit: 'chassis', halo: 'halo', 'front-suspension': 'frontSuspension', 'rear-suspension': 'rearSuspension', brakes: 'rearBrake', 'wheels-tyres': 'wheels',
}

/** Public UI boundary: draft, validated and manual-review data are rejected. */
export async function loadPublishedGrandPrix(grandPrixId: string, season = 2026): Promise<DatasetResult> {
  try {
    const response = await fetch(`/data/grands-prix/${season}/${encodeURIComponent(grandPrixId)}.json`, { cache: 'no-cache' })
    if (!response.ok) throw new Error(response.status === 404 ? 'dataset_not_published' : `dataset_request_${response.status}`)
    if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('dataset_not_published')
    const dataset = await response.json() as PublishedGrandPrixDataset
    if (dataset.schemaVersion !== 'fia-published-dataset-v1' || dataset.grandPrix?.id !== grandPrixId || !Array.isArray(dataset.updates) || dataset.updates.some((update) => update.validationState !== 'published')) throw new Error('invalid_published_dataset')
    retainedDatasets.set(grandPrixId, dataset)
    return { dataset, stale: false, error: null }
  } catch (cause) {
    const fallback = retainedDatasets.get(grandPrixId) ?? null
    return { dataset: fallback, stale: Boolean(fallback), error: cause instanceof Error ? cause : new Error('dataset_error') }
  }
}

export function toCarComponent(componentId: string | null | undefined): CarComponentId | null { return componentId ? stableToCarComponent[componentId] ?? null : null }

/** Reads every known event but exposes only the records that cleared publication. */
export async function loadPublishedSeason(season = 2026): Promise<PublishedSeasonResult> {
  const events = grandsPrix2026.filter((event) => event.season === season)
  const results = await Promise.all(events.map((event) => loadPublishedGrandPrix(event.id, season)))
  return {
    updates: results.flatMap(({ dataset }) => dataset?.updates ?? []),
    stale: results.some(({ stale }) => stale),
    errors: results.flatMap(({ error }) => error && error.message !== 'dataset_not_published' ? [error] : []),
  }
}

export function publishedUpdateCounts(updates: readonly PublishedUpdate[]) {
  return Object.fromEntries(updates.reduce((counts, update) => counts.set(update.teamId, (counts.get(update.teamId) ?? 0) + 1), new Map<string, number>()))
}
