import { readFile } from 'node:fs/promises'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'

/**
 * Extracts an embedded PDF text layer only. It deliberately does not invoke OCR:
 * image-only or unreadable documents return warnings for manual review.
 */
export async function extractPdfText(path) {
  const data = new Uint8Array(await readFile(path))
  const task = getDocument({ data, useWorker: false, stopAtErrors: true, verbosity: 0 })
  let document
  try {
    document = await task.promise
    const pages = []
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber); const content = await page.getTextContent()
      pages.push(content.items.map((item) => ('str' in item ? item.str : '')).join(' ').replace(/\s+/g, ' ').trim())
    }
    let metadata = {}
    try { metadata = (await document.getMetadata()).info ?? {} } catch { /* Metadata is optional. */ }
    const text = pages.filter(Boolean).join('\n\n')
    const extractionWarnings = []
    if (!text) extractionWarnings.push('unsupported_pdf: no embedded text layer found; OCR is intentionally disabled')
    if (pages.some((page) => !page)) extractionWarnings.push('partial_text_layer: one or more pages contain no extractable text')
    return { text, pageCount: document.numPages, metadata, extractionWarnings }
  } finally {
    await task.destroy()
  }
}
