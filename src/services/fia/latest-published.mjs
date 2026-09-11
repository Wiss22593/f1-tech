/** Pure date-based selection: only events with a real published dataset qualify. */
export function selectLatestPublishedGrandPrixId(events, publishedGrandPrixIds) {
  return [...events]
    .filter(({ id }) => publishedGrandPrixIds.has(id))
    .sort((a, b) => String(b.startDate ?? '').localeCompare(String(a.startDate ?? '')))[0]?.id ?? null
}
