import { readFile, appendFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import { eventRegistry } from './events.mjs'
import { resolveOfficialCalendar } from './official-calendar.mjs'
import { defaultSeason, watchDecision } from '../../src/domain/calendar.mjs'
import { resolveFiaEventIndex, fetchFiaDocumentIndex } from './finder.mjs'
import { downloadDocument } from './downloader.mjs'
import { validateAutoPublishDataset } from './auto-publish.mjs'

export async function runScheduled({ resolution, at = new Date(), publish = false, preflight = false, checkNow = false, findIndex = resolveFiaEventIndex, findDocuments = fetchFiaDocumentIndex, download = downloadDocument, readDataset = async path => { try { return JSON.parse(await readFile(path, 'utf8')) } catch { return null } }, pipeline } = {}) {
  if (checkNow && publish) throw new Error('check-now is a read-only dry-run')
  const event = resolution.event
  if (!event) return { status: resolution.status, needsPipeline: false }
  const decision = watchDecision(event, at)
  if (!decision.relevant && !checkNow) return { status: 'SKIP_OUTSIDE_WINDOW', needsPipeline: false }
  const indexUrl = await findIndex(event, { season: event.season })
  if (!indexUrl) return { status: 'NO_DOCUMENT_FOUND', needsPipeline: false }
  const documents = await findDocuments({ indexUrl, grandPrixId: event.id, season: event.season, eventName: event.eventName })
  if (!documents.length) return { status: 'NO_DOCUMENT_FOUND', needsPipeline: false }
  const document = documents[0], path = `public/data/grands-prix/${event.season}/${event.id}.json`
  if (checkNow) return { status: 'DOCUMENT_FOUND_DRY_RUN', needsPipeline: false, document }
  const current = await readDataset(path)
  // Compare actual bytes before saying UNCHANGED; an amended PDF at the same URL is detected.
  if (current && validateAutoPublishDataset(current, path).valid && current.parserVersion === 'fia-table-v4' && current.sourceDocument?.sourceUrl === document.sourceUrl) {
    const fetched = await download(document, resolve('ingestion/raw'))
    if (current.sourceDocument.documentHash === fetched.contentHash) return { status: 'UNCHANGED', needsPipeline: false, document, contentHash: fetched.contentHash }
  }
  if (preflight) return { status: 'NEEDS_PIPELINE', needsPipeline: true, document }
  if (!publish) return { status: 'DOCUMENT_FOUND_DRY_RUN', needsPipeline: false, document }
  const result = await pipeline({ ...event, indexUrl, documentId: document.documentId })
  return { ...result, needsPipeline: true }
}
async function runPipeline(event) {
  const args = [`--index-url=${event.indexUrl}`, `--grand-prix=${event.id}`, `--event-name=${event.eventName}`, `--grand-prix-name=${event.eventName}`, `--country=${event.country}`, `--circuit=${event.circuit}`, `--season=${event.season}`, `--start-date=${event.startDate}`, `--end-date=${event.endDate}`, '--allow-empty=true', '--publish=true']
  if (event.documentId) args.push(`--document-id=${event.documentId}`)
  return new Promise((done, reject) => {
    const child = spawn(process.execPath, ['--use-system-ca', 'ingestion/fia/run.mjs', ...args], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = '', stderr = ''; const timeout = setTimeout(() => { child.kill(); reject(new Error('FIA pipeline timeout')) }, 90000)
    child.stdout.on('data', data => { stdout += data }); child.stderr.on('data', data => { stderr += data })
    child.on('error', error => { clearTimeout(timeout); reject(error) })
    child.on('close', code => { clearTimeout(timeout); if (code) reject(new Error(stderr || `pipeline_exit_${code}`)); else { try { done(JSON.parse(stdout)) } catch { reject(new Error('Invalid pipeline response')) } } })
  })
}
if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const args = Object.fromEntries(process.argv.slice(2).map(arg => arg.replace(/^--/, '').split('=')))
  const at = args.at ? new Date(args.at) : new Date()
  const resolution = args.resolution ? JSON.parse(await readFile(args.resolution, 'utf8')) : await resolveOfficialCalendar(eventRegistry, { season: defaultSeason(eventRegistry, at), at })
  const result = await runScheduled({ resolution, at, publish: args.publish === 'true', preflight: args.preflight === 'true', checkNow: args['check-now'] === 'true', pipeline: runPipeline })
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `needs_pipeline=${result.needsPipeline}\n`)
  console.log(JSON.stringify({ calendar: resolution, discovery: result }, null, 2))
}
