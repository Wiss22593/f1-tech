export function showComponentSubtitle(title: string | null | undefined, componentName: string | null | undefined): boolean
export function hasPublishedUpdates(dataset: { grandPrix: { id: string }; updates: { validationState: string; grandPrixId: string }[] } | null | undefined): boolean
export function selectPublishedGarageGrandPrix(events: readonly { id: string; season: number; startDate?: string | null }[], publishedIds: ReadonlySet<string>, season: number, requestedId?: string | null): string | null

type FamilyContent = { presentedComponent: string | null; primaryReason: string | null; geometricDifference: string | null; description: string | null }
export function prepareFamilyDetails<T extends { componentId: string | null; fiaRecord?: { sourceRowNumber?: number } }>(updates: T[], getContent: (update: T) => FamilyContent): {
  rows: { update: T; number: number; content: FamilyContent; specific: FamilyContent }[]
  shared: { field: 'primaryReason' | 'geometricDifference' | 'description'; value: string; numbers: number[] }[]
}

export function shortGrandPrixLabel(name: string): string

export function quickUpdateFamilies<T extends { id: string; componentId: string | null; presentedComponent?: string | null; fiaRecord?: { componentName?: string | null } }>(updates: T[]): T[]
