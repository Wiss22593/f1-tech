import type { GrandPrix } from './grand-prix'
export function supportedSeasons(events: readonly GrandPrix[]): number[]
export function defaultSeason(events: readonly GrandPrix[], at?: Date): number | null
export function seasonEvents(events: readonly GrandPrix[], season: number): GrandPrix[]
export function calendarState(events: readonly GrandPrix[], at?: Date): { current: GrandPrix | null; next: GrandPrix | null; lastFinished: GrandPrix | null; nextFp1: GrandPrix | null }
export function selectSeasonGrandPrix(events: readonly GrandPrix[], publishedIds: ReadonlySet<string>, season: number, requestedId?: string | null, at?: Date): string | null
export function localSessionToUtc(local: string, offset: string, timeZone: string): string
