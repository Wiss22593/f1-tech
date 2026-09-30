import { readFile } from 'node:fs/promises'
import { getDocument, OPS } from 'pdfjs-dist/legacy/build/pdf.mjs'

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
    const layoutPages = []
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber); const content = await page.getTextContent()
      const items = content.items.flatMap((item) => 'str' in item && item.str.trim()
        ? [{ text: item.str.trim(), x: item.transform[4], y: item.transform[5], width: item.width, height: item.height }]
        : [])
      const operators = items.some(({ text }) => /^\d+$/.test(text)) ? await page.getOperatorList() : null
      layoutPages.push({ pageNumber, items, tableLines: operators ? extractTableLines(operators) : { horizontal: [], vertical: [] } })
      pages.push(items.map(({ text }) => text).join(' ').replace(/\s+/g, ' ').trim())
    }
    let metadata = {}
    try { metadata = (await document.getMetadata()).info ?? {} } catch { /* Metadata is optional. */ }
    const text = pages.filter(Boolean).join('\n\n')
    const extractionWarnings = []
    if (!text) extractionWarnings.push('unsupported_pdf: no embedded text layer found; OCR is intentionally disabled')
    if (pages.some((page) => !page)) extractionWarnings.push('partial_text_layer: one or more pages contain no extractable text')
    return { text, pages: layoutPages, pageCount: document.numPages, metadata, extractionWarnings }
  } finally {
    await task.destroy()
  }
}

/** Painted straight borders, in the same PDF coordinates as the text layer. */
export function extractTableLines({ fnArray, argsArray }) {
  const horizontal = []; const vertical = []; const stack = []
  let matrix = [1, 0, 0, 1, 0, 0]
  const point = (x, y) => [matrix[0]*x + matrix[2]*y + matrix[4], matrix[1]*x + matrix[3]*y + matrix[5]]
  for (let i = 0; i < fnArray.length; i += 1) {
    const op = fnArray[i]; const args = argsArray[i]
    if (op === OPS.save) stack.push([...matrix])
    else if (op === OPS.restore) matrix = stack.pop() ?? [1, 0, 0, 1, 0, 0]
    else if (op === OPS.transform) {
      const [a,b,c,d,e,f] = args; const [m,n,o,p,q,r] = matrix
      matrix = [m*a+o*b,n*a+p*b,m*c+o*d,n*c+p*d,m*e+o*f+q,n*e+p*f+r]
    } else if (op === OPS.constructPath && [OPS.stroke, OPS.fill, OPS.eoFill, OPS.fillStroke, OPS.eoFillStroke].includes(args?.[0]) && args[2]) {
      const [x1,y1,x2,y2] = args[2]
      const a = point(x1,y1); const b = point(x2,y2)
      const left = Math.min(a[0],b[0]); const right = Math.max(a[0],b[0]); const bottom = Math.min(a[1],b[1]); const top = Math.max(a[1],b[1])
      if (top-bottom <= 1.5 && right-left >= 20) horizontal.push({ x1:left,x2:right,y:(top+bottom)/2 })
      if (right-left <= 1.5 && top-bottom >= 10) vertical.push({ x:(left+right)/2,y1:bottom,y2:top })
    }
  }
  return { horizontal, vertical }
}
