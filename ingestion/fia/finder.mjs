/** Injected discovery keeps FIA URL discovery out of React and does not assume a Friday publication. */
export async function findDocuments(fetchDocumentIndex, grandPrixId) {
  const index = await fetchDocumentIndex(grandPrixId)
  return index.filter((item) => item.id && item.sourceUrl && /car\s+presentation\s+submissions?/i.test(item.title ?? ''))
}

const stripHtml = (value = '') => value.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()

/**
 * Reads an FIA decision-document index page. This remains outside React and
 * deliberately returns only official PDFs explicitly titled Car Presentation
 * Submissions; technical decisions and infringement documents are ignored.
 */
export async function fetchFiaDocumentIndex({ indexUrl, grandPrixId, season, eventName, fetchFn = fetch }) {
  const response = await fetchFn(indexUrl, { headers: { accept: 'text/html,application/xhtml+xml' }, signal: AbortSignal.timeout(Number(process.env.FIA_FETCH_TIMEOUT_MS ?? 30000)) })
  if (!response.ok) throw new Error(`FIA index request failed: ${response.status}`)
  const html = await response.text(); const retrievedAt = new Date().toISOString(); const documents = []
  const linkPattern = /<a\b[^>]*href=["']([^"']+\.pdf(?:\?[^"']*)?)["'][^>]*>([\s\S]*?)<\/a>/gi
  for (const match of html.matchAll(linkPattern)) {
    const sourceUrl = new URL(match[1], indexUrl).href; const title = stripHtml(match[2]) || sourceUrl.split('/').pop() || ''
    if (!/car\s+presentation\s+submissions?/i.test(title) && !/car[_\s-]presentation[_\s-]submissions?/i.test(sourceUrl)) continue
    const documentId = title.match(/\bdoc(?:ument)?\s*[:#-]?\s*(\d+)\b/i)?.[1] ?? null
    documents.push({ id: documentId ? `${grandPrixId}-doc-${documentId}` : `${grandPrixId}-${sourceUrl.split('/').pop()}`, eventId: grandPrixId, eventName, season, title, sourceUrl, documentId, publishedAt: null, retrievedAt })
  }
  return documents
}
