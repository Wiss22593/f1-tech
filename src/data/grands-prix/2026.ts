import registry from '../../../data/grands-prix/2026.json'
import type { GrandPrix } from '../../domain/grand-prix'

/** Single event registry shared with the Node ingestion pipeline. */
export const grandsPrix2026: readonly GrandPrix[] = registry.map((event) => ({
  id: event.grandPrixId,
  season: event.season,
  name: 'displayName' in event ? event.displayName ?? event.eventName : event.eventName,
  country: event.country,
  circuit: event.circuit,
  startDate: event.startDate,
  endDate: event.endDate,
  status: event.ingestionStatus === 'PROCESSED' ? 'completed' : event.ingestionStatus === 'PENDING' ? 'scheduled' : 'pending',
  sourceMetadata: { source: 'FIA 2026 calendar and decision-document index', retrievedAt: '2026-09-10' },
}))
