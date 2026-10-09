import { readFile, appendFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import { eventRegistry } from './events.mjs'
import { resolveOfficialCalendar } from './official-calendar.mjs'
import { defaultSeason, watchDecision } from '../../src/domain/calendar.mjs'
import { resolveFiaEventIndex, fetchFiaDocumentIndex } from './finder.mjs'
import { validateAutoPublishDataset } from './auto-publish.mjs'

export async function runScheduled({ resolution, at = new Date(), publish = false, dryRun = false, preflight = false, checkNow = false, findIndex = resolveFiaEventIndex, findDocuments = fetchFiaDocumentIndex, readDataset = async path => { try { return JSON.parse(await readFile(path, 'utf8')) } catch { return null } }, pipeline } = {}) {
  if ((checkNow || dryRun) && publish) throw new Error('dry-run and check-now cannot publish')
  const event = resolution.event
  if (!event) return { status: resolution.status, needsPipeline: false }
  const decision = watchDecision(event, at)
  if (!decision.relevant && !checkNow && !dryRun) return { status: 'SKIP_OUTSIDE_WINDOW', needsPipeline: false }
  const path = 'public/data/grands-prix/' + event.season + '/' + event.id + '.json'
  const current = await readDataset(path)
  // Stop per GP after verified publication, including later FIA revisions by design.
  if (current && validateAutoPublishDataset(current, path).valid
    && current.grandPrix?.startDate === event.startDate && current.grandPrix?.endDate === event.endDate
    && current.validation?.manualReview === 0 && current.validation?.recordsReceived === current.updates.length) {
    return { status: 'ALREADY_PUBLISHED', needsPipeline: false, contentHash: current.sourceDocument.documentHash, revisionPolicy: 'Stop searching this GP after verified publication; later FIA revisions are not polled.' }
  }
  const indexUrl = await findIndex(event, { season: event.season })
  if (!indexUrl) return { status: 'PENDING_DOCUMENT', needsPipeline: false }
  const documents = await findDocuments({ indexUrl, grandPrixId: event.id, season: event.season, eventName: event.eventName })
  if (!documents.length) return { status: 'PENDING_DOCUMENT', needsPipeline: false }
  const document = documents[0]
  if (checkNow) return { status: 'DOCUMENT_FOUND_DRY_RUN', needsPipeline: false, document }
  if (preflight) return { status: 'NEEDS_PIPELINE', needsPipeline: true, document }
  if (!publish && !dryRun) return { status: 'DOCUMENT_FOUND_DRY_RUN', needsPipeline: false, document }
  const result = await pipeline({ ...event, indexUrl, documentId: document.documentId }, { publish })
  if (publish && result.status === 'MANUAL_REVIEW_ONLY') throw new Error('PUBLICATION_BLOCKED_MANUAL_REVIEW: official document parsed, but no records passed the existing publication gate; see ingestion/output/manual-review')
  return { ...result, status: result.status === 'NO_DOCUMENT_FOUND' ? 'PENDING_DOCUMENT' : result.status, needsPipeline: true }
}
export async function runPipeline(event, { publish = true } = {}) {
  const args = [`--index-url=${event.indexUrl}`, `--grand-prix=${event.id}`, `--event-name=${event.eventName}`, `--grand-prix-name=${event.eventName}`, `--country=${event.country}`, `--circuit=${event.circuit}`, `--season=${event.season}`, `--start-date=${event.startDate}`, `--end-date=${event.endDate}`, '--allow-empty=true', `--publish=${publish}`]
  if (event.documentId) args.push(`--document-id=${event.documentId}`)
  return new Promise((done, reject) => {
    const child = spawn(process.execPath, ['--use-system-ca', 'ingestion/fia/run.mjs', ...args], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = '', stderr = ''; const timeout = setTimeout(() => { child.kill(); reject(new Error('FIA pipeline timeout')) }, 300000)
    child.stdout.on('data', data => { stdout += data }); child.stderr.on('data', data => { stderr += data })
    child.on('error', error => { clearTimeout(timeout); reject(error) })
    child.on('close', code => { clearTimeout(timeout); if (code) reject(new Error(stderr || `pipeline_exit_${code}`)); else { try { done(JSON.parse(stdout)) } catch { reject(new Error('Invalid pipeline response')) } } })
  })
}
if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const args = Object.fromEntries(process.argv.slice(2).map(arg => arg.replace(/^--/, '').split('=')))
  const at = args.at ? new Date(args.at) : new Date()
  const resolution = args.resolution ? JSON.parse(await readFile(args.resolution, 'utf8')) : await resolveOfficialCalendar(eventRegistry, { season: defaultSeason(eventRegistry, at), at })
  const result = await runScheduled({ resolution, at, publish: args.publish === 'true', dryRun: args['dry-run'] === 'true', preflight: args.preflight === 'true', checkNow: args['check-now'] === 'true', pipeline: runPipeline })
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `needs_pipeline=${result.needsPipeline}\n`)
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, '\nFIA ingestion: **' + result.status + '**. ' + (result.status === 'PENDING_DOCUMENT' ? 'Pending official document; retry next scheduled run.' : result.revisionPolicy ?? '') + '\n')
  console.log(JSON.stringify({ calendar: resolution, discovery: result }, null, 2))
}
