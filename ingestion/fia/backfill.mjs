import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { eventRegistry2026, selectCurrentEvents } from './events.mjs'

const args = Object.fromEntries(process.argv.slice(2).filter((value) => value.startsWith('--')).map((value) => { const [key, ...rest] = value.slice(2).split('='); return [key, rest.join('=') || true] }))
const season = Number(args.season ?? 2026)
if (args.backfill !== 'true' && args.current !== 'true') throw new Error('Use --backfill=true or --current=true.')
const allEvents = eventRegistry2026.filter((event) => event.id.includes(String(season)))
const events = args.current === 'true' ? selectCurrentEvents(allEvents, args.at ? new Date(String(args.at)) : new Date()) : allEvents
const today = (args.at ? new Date(String(args.at)) : new Date()).toISOString().slice(0, 10)
const results = []
for (const event of events) {
  if (!event.indexUrl) { const pending = event.startDate > today; results.push({ grandPrixId: event.id, document: null, parsed: 0, validated: 0, published: 0, manualReview: 0, errors: [], status: pending ? 'PENDING' : 'NO_DOCUMENT_FOUND', reason: 'OFFICIAL_EVENT_INDEX_NOT_PUBLISHED' }); continue }
  const parameters = [`--index-url=${event.indexUrl}`, `--grand-prix=${event.id}`, `--event-name=${event.eventName}`, `--grand-prix-name=${event.eventName}`, `--country=${event.country}`, `--circuit=${event.circuit}`, `--season=${season}`, '--allow-empty=true']
  if (event.documentId) parameters.push(`--document-id=${event.documentId}`)
  if (args.publish === 'true') parameters.push('--publish=true')
  const result = await new Promise((done) => { const child = spawn(process.execPath, ['--use-system-ca', 'ingestion/fia/run.mjs', ...parameters], { stdio: ['ignore', 'pipe', 'pipe'] }); let stdout = ''; let stderr = ''; let timedOut = false; const timeout = setTimeout(() => { timedOut = true; child.kill() }, Number(process.env.FIA_EVENT_TIMEOUT_MS ?? 90000)); child.stdout.on('data', (data) => { stdout += data }); child.stderr.on('data', (data) => { stderr += data }); child.on('close', (code) => { clearTimeout(timeout); done({ code, stdout, stderr: timedOut ? `${stderr}\nevent_timeout` : stderr }) }) })
  try { const summary = JSON.parse(result.stdout); results.push({ grandPrixId: event.id, document: summary.document ?? null, documentHash: summary.contentHash ?? null, parsed: summary.recordsFound ?? 0, validated: summary.validated ?? 0, publishable: summary.publishable ?? 0, published: summary.published ?? 0, manualReview: summary.manualReview ?? 0, errors: result.code === 0 ? [] : [result.stderr || `exit_${result.code}`], status: result.code === 0 ? (summary.status === 'NO_DOCUMENT_FOUND' ? 'NO_DOCUMENT_FOUND' : summary.status === 'MANUAL_REVIEW_ONLY' ? 'PARTIAL' : summary.alreadyPublished ? 'UNCHANGED' : summary.published ? 'PROCESSED' : 'PARTIAL') : 'ERROR' }) } catch { results.push({ grandPrixId: event.id, document: null, parsed: 0, validated: 0, published: 0, manualReview: 0, errors: [result.stderr || result.stdout || 'unparseable_runner_result'], status: 'ERROR' }) }
}
const mode = args.current === 'true' ? 'current' : 'backfill'
const report = { generatedAt: new Date().toISOString(), season, mode, results }
await mkdir(resolve('ingestion/output/reports'), { recursive: true })
const reportPath = resolve('ingestion/output/reports', `${season}-${mode}.json`)
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify({ reportPath, processedGrandPrix: results.length, published: results.reduce((sum, result) => sum + result.published, 0), manualReview: results.reduce((sum, result) => sum + result.manualReview, 0), statuses: results.map(({ grandPrixId, status }) => ({ grandPrixId, status })) }, null, 2))
