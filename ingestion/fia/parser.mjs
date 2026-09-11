import { normalizeComponent, normalizeTeam } from './normalizer.mjs'
import { suggestFiaComponents } from './component-registry.mjs'

const teamMarkers = /McLaren Mastercard F1 Team|Mercedes-AMG PETRONAS F1 Team|Oracle Red Bull Racing\.?|S\s*cuderia Ferrari HP|Williams|Visa Cash App Racing Bulls|Aston Martin Aramco F1 Team|\*TGR HAAS F1 TEAM\*|Audi Revolut F1 Team|BWT Alpine F1 Team|C\s*adillac/gi
const entryStart = /(?:^|\s)(\d+)\s+(.+?)(?=\s+(?:Performance|Circuit specific|Reliability|Flow Conditioning)\b)/gi
const tableHeader = /Updated component|Primary reason for update|Geometric differences compared to previous version|Brief description on how the update works/gi

const cleanCell = (value = '') => typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() || null : null
const joinCell = (items) => cleanCell([...items]
  .sort((a, b) => Math.abs(b.y - a.y) > 1.5 ? b.y - a.y : a.x - b.x)
  .map(({ text }) => text)
  .join(' '))

function createRecord(fields, context, teamId, rowNumber) {
  const componentId = normalizeComponent(fields.componentName ?? '')
  const sourceText = cleanCell([fields.componentName, fields.primaryReason, fields.geometricDifference, fields.briefDescription].filter(Boolean).join(' | '))
  if (!teamId || !componentId) return {
    rejected: {
      page: fields.page ?? null, teamDetected: teamId, rawComponentText: fields.componentName, sourceText,
      reason: !teamId ? 'unmapped_team' : 'unmapped_component', suggestedComponentIds: componentId ? [] : suggestFiaComponents(fields.componentName ?? ''),
    },
  }
  return {
    record: {
      id: `${context.documentId}-${teamId}-${componentId}-${rowNumber}`, season: context.season, grandPrixId: context.grandPrixId, teamId, componentId,
      componentName: fields.componentName, primaryReason: fields.primaryReason, geometricDifference: fields.geometricDifference, briefDescription: fields.briefDescription,
      category: fields.primaryReason, source: 'FIA', sourceUrl: context.sourceUrl ?? null, sourceDocument: context.sourceDocument, sourceText,
      sourceLanguage: context.sourceLanguage ?? 'en', translations: {}, description: fields.briefDescription, area: null, objective: null,
      magnitude: null, technicalState: 'SUBMITTED', validationState: 'draft', publishedAt: null, contentHash: context.contentHash, parserConfidence: 'deterministic_table', parserVersion: context.parserVersion ?? 'fia-table-v2',
    },
  }
}

function parseLayoutPages(pages, context) {
  const records = []; const rejected = []
  let activeTeamId = null
  for (const page of pages) {
    const pageText = page.items.map(({ text }) => text).join(' ')
    const teamMatch = pageText.match(teamMarkers)?.[0]
    const detectedTeamId = normalizeTeam(teamMatch ?? '')
    if (detectedTeamId) activeTeamId = detectedTeamId
    const teamId = detectedTeamId ?? activeTeamId
    if (!teamId || /no updates?(?: submitted)?(?: for this event)?/i.test(pageText)) continue

    const componentHeader = page.items.find(({ text }) => /^Updated$/i.test(text) || /^Updated component$/i.test(text))
    const primaryHeader = page.items.find(({ text }) => /^Primary reason\b/i.test(text))
    const geometricHeader = page.items.find(({ text }) => /^Geometric differences\b/i.test(text))
    const briefHeader = page.items.find(({ text }) => /^Brief description\b/i.test(text))
    if (!componentHeader || !primaryHeader || !geometricHeader || !briefHeader) continue

    const headerBottom = Math.min(componentHeader.y, primaryHeader.y, geometricHeader.y, briefHeader.y) - 16
    const componentEnd = primaryHeader.x - 10
    const primaryEnd = geometricHeader.x - 25
    const geometricEnd = briefHeader.x - 20
    const rowNumbers = page.items
      .filter(({ text, x, y }) => /^\d+$/.test(text) && x < componentHeader.x && y < headerBottom)
      .sort((a, b) => b.y - a.y)
    for (let index = 0; index < rowNumbers.length; index += 1) {
      const row = rowNumbers[index]
      const upper = index === 0 ? Math.min(headerBottom, row.y + 32) : (rowNumbers[index - 1].y + row.y) / 2
      const lower = index === rowNumbers.length - 1 ? -Infinity : (row.y + rowNumbers[index + 1].y) / 2
      const rowItems = page.items.filter(({ x, y }) => x >= componentHeader.x - 16 && y < upper && y >= lower)
      const fields = {
        page: page.pageNumber,
        componentName: joinCell(rowItems.filter(({ x }) => x < componentEnd)),
        primaryReason: joinCell(rowItems.filter(({ x }) => x >= componentEnd && x < primaryEnd)),
        geometricDifference: joinCell(rowItems.filter(({ x }) => x >= primaryEnd && x < geometricEnd)),
        briefDescription: joinCell(rowItems.filter(({ x }) => x >= geometricEnd)),
      }
      if (!fields.componentName) continue
      const result = createRecord(fields, context, teamId, row.text)
      if (result.record) records.push(result.record); else rejected.push(result.rejected)
    }
  }
  return { records, rejected }
}

function parseFlattenedText(text, context) {
  const markers = [...text.matchAll(teamMarkers)]
  const records = []; const rejected = []
  for (let markerIndex = 0; markerIndex < markers.length; markerIndex += 1) {
    const marker = markers[markerIndex]; const teamSource = marker[0]
    const teamId = normalizeTeam(teamSource)
    const start = (marker.index ?? 0) + teamSource.length; const end = markers[markerIndex + 1]?.index ?? text.length
    const section = text.slice(start, end).replace(tableHeader, '').trim()
    if (/no updates?/i.test(section)) continue
    const starts = [...section.matchAll(entryStart)]
    for (let entryIndex = 0; entryIndex < starts.length; entryIndex += 1) {
      const match = starts[entryIndex]; const componentName = cleanCell(match[2]); const entryStartIndex = match.index ?? 0
      const entryEnd = starts[entryIndex + 1]?.index ?? section.length; const sourceText = cleanCell(section.slice(entryStartIndex, entryEnd))
      const reasonMatch = sourceText?.match(/(?:^|\s)(Performance\s*[-–]\s*(?:Flow Conditioning|Local Load|Drag Reduction)|Circuit specific\s*[-–]\s*(?:Drag Range|Balance Range)|Reliability|Flow Conditioning)\b/i)
      const primaryReason = cleanCell(reasonMatch?.[1])
      const remainder = reasonMatch ? cleanCell(sourceText.slice((reasonMatch.index ?? 0) + reasonMatch[0].length)) : null
      const result = createRecord({ page: null, componentName, primaryReason, geometricDifference: null, briefDescription: remainder }, context, teamId, match[1])
      if (result.record) records.push(result.record); else rejected.push(result.rejected)
    }
  }
  return { records, rejected }
}

/**
 * Parses FIA's text-layer table conservatively. Unknown teams/components are
 * rejected for manual review; no technical analysis is invented from prose.
 */
export function parsePresentationText(input, context) {
  if (typeof input === 'object' && Array.isArray(input?.pages)) {
    const parsed = parseLayoutPages(input.pages, context)
    if (parsed.records.length || parsed.rejected.length) return parsed
    return parseFlattenedText(input.text ?? '', context)
  }
  return parseFlattenedText(input, context)
}
