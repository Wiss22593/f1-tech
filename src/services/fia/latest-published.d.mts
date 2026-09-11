export function selectLatestPublishedGrandPrixId(
  events: readonly { id: string; startDate: string | null }[],
  publishedGrandPrixIds: ReadonlySet<string>,
): string | null
