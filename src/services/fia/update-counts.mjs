/** Product counts are independent of hotspots, meshes and highlightability. */
export function publishedUpdateCounts(records, grandPrixId) {
  const counts = new Map()
  for (const record of records) if (record.validationState === 'published' && (!grandPrixId || record.grandPrixId === grandPrixId)) counts.set(record.teamId, (counts.get(record.teamId) ?? 0) + 1)
  return Object.fromEntries(counts)
}
