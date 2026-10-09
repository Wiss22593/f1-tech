import { officialRequest } from './request.mjs'
import { matchesEventName } from './event-matching.mjs'
/** Injected discovery keeps FIA URL discovery out of React and does not assume a Friday publication. */
export async function findDocuments(fetchDocumentIndex, grandPrixId) {
  const index = await fetchDocumentIndex(grandPrixId)
  return index.filter((item) => item.id && item.sourceUrl && isPresentationTitle(item.title ?? ''))
}

const requestOptions = () => ({
  headers: { accept: 'text/html,application/xhtml+xml', 'cache-control': 'no-cache' },
})

const stripHtml = (value = '') => value.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()
const normalizeTitle = (value = '') => stripHtml(value).replace(/[–—]/g, '-').replace(/\s+Published on\b.*$/i, '').trim()

/** Only the explicit FIA document name is accepted; generic technical wording is never sufficient. */
export function isPresentationTitle(value = '') {
  return /^(?:doc(?:ument)?\s*[:#-]?\s*\d+\s*(?:-\s*)?)?car\s+presentation\s+submissions?$/i.test(normalizeTitle(value))
}

function isOfficialFiaUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && (url.hostname === 'fia.com' || url.hostname.endsWith('.fia.com'))
  } catch {
    return false
  }
}

function directPdfUrl(value) {
  try {
    const url = new URL(value)
    return /\.pdf$/i.test(url.pathname) ? url.href : null
  } catch {
    return null
  }
}

function extractEventBlock(html, event, required) {
  const markerPattern = /<div\b[^>]*class=["'][^"']*\bevent-title\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi
  const markers = [...html.matchAll(markerPattern)]
  const matching = markers.flatMap((match, index) => matchesEventName(event, match[1]) ? [index] : [])
  if (matching.length > 1) throw new Error('manual_review: ambiguous FIA event blocks')
  const markerIndex = matching[0] ?? -1
  if (markerIndex < 0) return required || markers.length ? null : html
  const start = markers[markerIndex].index ?? 0
  const end = markers[markerIndex + 1]?.index ?? html.length
  return html.slice(start, end)
}

function extractCandidates(html, pageUrl) {
  const candidates = []
  const linkPattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi
  for (const match of html.matchAll(linkPattern)) {
    const titleBlock = match[2].match(/<div\b[^>]*class=["'][^"']*\btitle\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)?.[1]
    const title = normalizeTitle(titleBlock ?? match[2])
    if (!isPresentationTitle(title)) continue
    const candidateUrl = new URL(match[1], pageUrl).href
    if (!isOfficialFiaUrl(candidateUrl)) continue
    candidates.push({ title, candidateUrl })
  }
  return candidates
}

async function resolveOfficialPdf(candidateUrl, fetchFn) {
  const direct = directPdfUrl(candidateUrl)
  if (direct && isOfficialFiaUrl(direct)) return direct

  const response = await officialRequest(candidateUrl, requestOptions(), { fetchFn })
  if (!response.ok) throw new Error(`FIA document link request failed: ${response.status}`)
  const redirected = directPdfUrl(response.url)
  if (redirected && isOfficialFiaUrl(redirected)) return redirected
  const html = await response.text()
  const pdfMatch = html.match(/\b(?:href|src)=["']([^"']+\.pdf(?:\?[^"']*)?)["']/i)
  if (!pdfMatch) return null
  const resolved = new URL(pdfMatch[1], candidateUrl).href
  return isOfficialFiaUrl(resolved) ? resolved : null
}

async function documentsFromHtml({ html, pageUrl, grandPrixId, season, eventName, fetchFn, requireEventScope, requireSeason = false }) {
  const eventBlock = extractEventBlock(html, { id: grandPrixId, season, eventName }, requireEventScope)
  if (!eventBlock) return []
  const retrievedAt = new Date().toISOString()
  const documents = []
  for (const candidate of extractCandidates(eventBlock, pageUrl)) {
    const sourceUrl = await resolveOfficialPdf(candidate.candidateUrl, fetchFn)
    if (!sourceUrl) continue
    if (requireSeason && !new URL(sourceUrl).pathname.split('/').pop().startsWith(season + '_')) continue
    const documentId = candidate.title.match(/\bdoc(?:ument)?\s*[:#-]?\s*(\d+)\b/i)?.[1] ?? null
    documents.push({ id: documentId ? `${grandPrixId}-doc-${documentId}` : `${grandPrixId}-${sourceUrl.split('/').pop()}`, eventId: grandPrixId, eventName, season, title: candidate.title, sourceUrl, documentId, publishedAt: null, retrievedAt })
  }
  return [...new Map(documents.map((document) => [document.sourceUrl, document])).values()]
}

export function deriveSeasonIndexUrl(indexUrl) {
  const url = new URL(indexUrl)
  const marker = url.pathname.toLowerCase().lastIndexOf('/event/')
  if (marker < 0) return null
  url.pathname = url.pathname.slice(0, marker)
  url.search = ''
  url.hash = ''
  return url.href.replace(/\/$/, '')
}

/**
 * Reads an FIA decision-document index page. This remains outside React and
 * deliberately returns only official PDFs explicitly titled Car Presentation
 * Submissions; technical decisions and infringement documents are ignored.
 */
export async function fetchFiaDocumentIndex({ indexUrl, grandPrixId, season, eventName, fetchFn = fetch }) {
  let primaryError
  try {
    const response = await officialRequest(indexUrl, requestOptions(), { fetchFn })
    if (!response.ok) throw new Error(`FIA index request failed: ${response.status}`)
    const html = await response.text()
    const primary = await documentsFromHtml({ html, pageUrl: indexUrl, grandPrixId, season, eventName, fetchFn, requireEventScope: false, requireSeason: /\/season\/?$/.test(new URL(indexUrl).pathname) })
    if (primary.length) return primary
  } catch (error) { if (error.message.startsWith('manual_review:')) throw error; primaryError = error }

  const seasonIndexUrl = deriveSeasonIndexUrl(indexUrl)
  if (!seasonIndexUrl || seasonIndexUrl === indexUrl) { if (primaryError) throw primaryError; return [] }
  const fallbackResponse = await officialRequest(seasonIndexUrl, requestOptions(), { fetchFn })
  if (!fallbackResponse.ok) {
    const alternative = new URL(seasonIndexUrl)
    alternative.pathname = alternative.pathname.replace(/\/season\/[^/]+$/, '/season')
    if (alternative.href === seasonIndexUrl) throw new Error('FIA season index request failed: ' + fallbackResponse.status)
    const response = await officialRequest(alternative.href, requestOptions(), { fetchFn })
    if (!response.ok) throw new Error('FIA alternative index request failed: ' + response.status)
    return documentsFromHtml({ html: await response.text(), pageUrl: alternative.href, grandPrixId, season, eventName, fetchFn, requireEventScope: true, requireSeason: true })
  }
  const fallbackHtml = await fallbackResponse.text()
  return documentsFromHtml({ html: fallbackHtml, pageUrl: seasonIndexUrl, grandPrixId, season, eventName, fetchFn, requireEventScope: true })
}

/** Resolve only exact event links advertised by the official season index. */
export async function resolveFiaEventIndex(event, { season = 2026, fetchFn = fetch } = {}) {
  if (event.indexUrl) return event.indexUrl
  const seasonUrl = event.seasonIndexUrl ?? (season === 2026 ? 'https://www.fia.com/documents/championships/fia-formula-one-world-championship-14/season/season-2026-2072' : null)
  if (!seasonUrl) return null
  if (!isOfficialFiaUrl(seasonUrl)) throw new Error('Non-official FIA season index')
  let effectiveUrl = seasonUrl
  let response = await officialRequest(seasonUrl, requestOptions(), { fetchFn })
  if (!response.ok) {
    const alternative = new URL(seasonUrl)
    alternative.pathname = alternative.pathname.replace(/\/season\/[^/]+$/, '/season')
    if (alternative.href === seasonUrl) throw new Error('FIA season index request failed: ' + response.status)
    console.error('FIA_INDEX_FALLBACK status=' + response.status + ' url=' + alternative.href)
    response = await officialRequest(alternative.href, requestOptions(), { fetchFn })
    effectiveUrl = alternative.href
  }
  if (!response.ok) throw new Error('FIA season index request failed: ' + response.status)
  const html = await response.text()
  const matchedUrls = new Set()
  for (const match of html.matchAll(/<option\b[^>]*value=["']([^"']+)["'][^>]*>([\s\S]*?)<\/option>/gi)) {
    if (!matchesEventName({ ...event, season: event.season ?? season }, match[2])) continue
    const url = new URL(match[1], seasonUrl)
    if (isOfficialFiaUrl(url.href) && url.pathname.includes('/season/season-' + season + '-') && url.pathname.includes('/event/')) matchedUrls.add(url.href)
  }
  if (matchedUrls.size > 1) throw new Error('manual_review: ambiguous FIA event indexes')
  const scoped = extractEventBlock(html, { ...event, season: event.season ?? season }, true)
  const hasSeasonDocument = scoped && extractCandidates(scoped, effectiveUrl).some(c => new URL(c.candidateUrl).pathname.split('/').pop().startsWith(season + '_'))
  return [...matchedUrls][0] ?? (hasSeasonDocument ? effectiveUrl : null)
}
