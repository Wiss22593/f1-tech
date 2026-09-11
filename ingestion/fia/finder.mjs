/** Injected discovery keeps FIA URL discovery out of React and does not assume a Friday publication. */
export async function findDocuments(fetchDocumentIndex, grandPrixId) {
  const index = await fetchDocumentIndex(grandPrixId)
  return index.filter((item) => item.id && item.sourceUrl && isPresentationTitle(item.title ?? ''))
}

const requestOptions = () => ({
  headers: { accept: 'text/html,application/xhtml+xml', 'cache-control': 'no-cache' },
  signal: AbortSignal.timeout(Number(process.env.FIA_FETCH_TIMEOUT_MS ?? 30000)),
})

const stripHtml = (value = '') => value.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()
const normalizeTitle = (value = '') => stripHtml(value).replace(/[–—]/g, '-').replace(/\s+Published on\b.*$/i, '').trim()
const normalizeEventName = (value = '') => stripHtml(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

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

function extractEventBlock(html, eventName, required) {
  const markerPattern = /<div\b[^>]*class=["'][^"']*\bevent-title\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi
  const markers = [...html.matchAll(markerPattern)]
  const target = normalizeEventName(eventName)
  const markerIndex = markers.findIndex((match) => normalizeEventName(match[1]) === target)
  if (markerIndex < 0) return required ? null : html
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

  const response = await fetchFn(candidateUrl, requestOptions())
  if (!response.ok) throw new Error(`FIA document link request failed: ${response.status}`)
  const redirected = directPdfUrl(response.url)
  if (redirected && isOfficialFiaUrl(redirected)) return redirected
  const html = await response.text()
  const pdfMatch = html.match(/\b(?:href|src)=["']([^"']+\.pdf(?:\?[^"']*)?)["']/i)
  if (!pdfMatch) return null
  const resolved = new URL(pdfMatch[1], candidateUrl).href
  return isOfficialFiaUrl(resolved) ? resolved : null
}

async function documentsFromHtml({ html, pageUrl, grandPrixId, season, eventName, fetchFn, requireEventScope }) {
  const eventBlock = extractEventBlock(html, eventName, requireEventScope)
  if (!eventBlock) return []
  const retrievedAt = new Date().toISOString()
  const documents = []
  for (const candidate of extractCandidates(eventBlock, pageUrl)) {
    const sourceUrl = await resolveOfficialPdf(candidate.candidateUrl, fetchFn)
    if (!sourceUrl) continue
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
  const response = await fetchFn(indexUrl, requestOptions())
  if (!response.ok) throw new Error(`FIA index request failed: ${response.status}`)
  const html = await response.text()
  const primary = await documentsFromHtml({ html, pageUrl: indexUrl, grandPrixId, season, eventName, fetchFn, requireEventScope: false })
  if (primary.length) return primary

  const seasonIndexUrl = deriveSeasonIndexUrl(indexUrl)
  if (!seasonIndexUrl || seasonIndexUrl === indexUrl) return []
  const fallbackResponse = await fetchFn(seasonIndexUrl, requestOptions())
  if (!fallbackResponse.ok) throw new Error(`FIA season index request failed: ${fallbackResponse.status}`)
  const fallbackHtml = await fallbackResponse.text()
  return documentsFromHtml({ html: fallbackHtml, pageUrl: seasonIndexUrl, grandPrixId, season, eventName, fetchFn, requireEventScope: true })
}
