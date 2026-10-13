export function showComponentSubtitle(title: string | null | undefined, componentName: string | null | undefined): boolean
export function hasPublishedUpdates(dataset: { grandPrix: { id: string }; updates: { validationState: string; grandPrixId: string }[] } | null | undefined): boolean
export function selectPublishedGarageGrandPrix(events: readonly { id: string; season: number; startDate?: string | null }[], publishedIds: ReadonlySet<string>, season: number, requestedId?: string | null): string | null
