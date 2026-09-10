import { normalizeComponent, normalizeTeam } from './normalizer.mjs'
import { suggestFiaComponents } from './component-registry.mjs'

const teamMarkers = /McLaren Mastercard F1 Team|Mercedes-AMG PETRONAS F1 Team|Oracle Red Bull Racing\.?|S\s*cuderia Ferrari HP|Williams|Visa Cash App Racing Bulls|Aston Martin Aramco F1 Team|\*TGR HAAS F1 TEAM\*|Audi Revolut F1 Team|BWT Alpine F1 Team|C\s*adillac/gi
const entryStart = /(?:^|\s)(\d+)\s+(.+?)(?=\s+(?:Performance|Circuit specific|Reliability|Flow Conditioning)\b)/gi

/**
 * Parses FIA's text-layer table conservatively. Unknown teams/components are
 * rejected for manual review; no technical analysis is invented from prose.
 */
export function parsePresentationText(text, context) {
  const markers = [...text.matchAll(teamMarkers)]
  const records = []; const rejected = []
  for (let markerIndex = 0; markerIndex < markers.length; markerIndex += 1) {
    const marker = markers[markerIndex]; const teamSource = marker[0]
    const teamId = normalizeTeam(teamSource)
    const start = (marker.index ?? 0) + teamSource.length; const end = markers[markerIndex + 1]?.index ?? text.length
    const section = text.slice(start, end).replace(/Updated component Primary reason for update Geometric differences compared to previous version Brief description on how the update works \(min 20, max 100 words\)/i, '').trim()
    if (/no updates submitted/i.test(section)) continue
    const starts = [...section.matchAll(entryStart)]
    for (let entryIndex = 0; entryIndex < starts.length; entryIndex += 1) {
      const match = starts[entryIndex]; const componentSource = match[2].trim(); const entryStartIndex = match.index ?? 0
      const entryEnd = starts[entryIndex + 1]?.index ?? section.length; const sourceText = section.slice(entryStartIndex, entryEnd).trim()
      const componentId = normalizeComponent(componentSource)
      if (!teamId || !componentId) { rejected.push({ page: null, teamDetected: teamId, rawComponentText: componentSource, sourceText, reason: !teamId ? 'unmapped_team' : 'unmapped_component', suggestedComponentIds: componentId ? [] : suggestFiaComponents(componentSource) }); continue }
      records.push({
        id: `${context.documentId}-${teamId}-${componentId}-${match[1]}`, season: context.season, grandPrixId: context.grandPrixId, teamId, componentId,
        category: null, source: 'FIA', sourceUrl: context.sourceUrl ?? null, sourceDocument: context.sourceDocument, sourceText,
        sourceLanguage: context.sourceLanguage ?? 'en', translations: {}, description: sourceText, area: null, objective: null,
        magnitude: null, technicalState: 'SUBMITTED', validationState: 'draft', publishedAt: null, contentHash: context.contentHash, parserConfidence: 'deterministic_table', parserVersion: context.parserVersion ?? 'fia-table-v1',
      })
    }
  }
  return { records, rejected }
}
