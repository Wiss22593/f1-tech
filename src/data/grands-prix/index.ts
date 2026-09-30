/// <reference types="vite/client" />
import type { GrandPrix } from '../../domain/grand-prix'
interface RegistryEvent { grandPrixId: string; season: number; eventName: string; displayName?: string; country: string; circuit: string; startDate: string; endDate: string; ingestionStatus: string }
// Adding a numeric season registry automatically adds it to the product.
const registries = import.meta.glob<RegistryEvent[]>('../../../data/grands-prix/[0-9][0-9][0-9][0-9].json', { eager: true, import: 'default' })
export const grandsPrix: readonly GrandPrix[] = Object.entries(registries).filter(([path]) => /\/\d{4}\.json$/.test(path)).flatMap(([, events]) => events.map(event => ({
  id: event.grandPrixId, season: event.season, name: event.displayName ?? event.eventName, country: event.country, circuit: event.circuit,
  startDate: event.startDate, endDate: event.endDate,
  status: event.ingestionStatus === 'PROCESSED' ? 'completed' as const : event.ingestionStatus === 'CANCELLED' ? 'cancelled' as const : 'scheduled' as const,
})))
