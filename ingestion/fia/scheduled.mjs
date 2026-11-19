import { readFile, appendFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import { eventRegistry } from './events.mjs'
import { resolveOfficialCalendar } from './official-calendar.mjs'
import { defaultSeason, watchDecision } from '../../src/domain/calendar.mjs'
import { resolveFiaEventIndex, fetchFiaDocumentIndex } from './finder.mjs'
import { isCompletePublishedDataset } from './auto-publish.mjs'

async function readPublishedDataset(path) {
  try { return JSON.parse(await readFile(path, 'utf8')) }
  catch (error) {
    if (error?.code === 'ENOENT') return null
    throw error
  }
}

export async function runScheduled({ resolution, at = new Date(), publish = false, dryRun = false, preflight = false, checkNow = false, findIndex = resolveFiaEventIndex, findDocuments = fetchFiaDocumentIndex, readDataset = readPublishedDataset, pipeline } = {}) {
  if ((checkNow || dryRun) && publish) throw new Error('dry-run and check-now cannot publish')
  const event = resolution.event
  if (!event) return { status: resolution.status, needsPipeline: false }
  const path = 'public/data/grands-prix/' + event.season + '/' + event.id + '.json'
  const current = await readDataset(path)
  // A complete publication is final for this event; never rediscover or redownload its PDF.
  if (current && isCompletePublishedDataset(current, path)) {
    return { status: 'ALREADY_PUBLISHED', needsPipeline: false, grandPrixId: event.id }
  }
  const decision = watchDecision(event, at)
  if (!decision.relevant && !checkNow && !dryRun) return { status: 'SKIP_OUTSIDE_WINDOW', needsPipeline: false }
  const indexUrl = await findIndex(event, { season: event.season })
  if (!indexUrl) return { status: 'PENDING', needsPipeline: false, grandPrixId: event.id, reason: 'OFFICIAL_EVENT_INDEX_NOT_AVAILABLE' }
  const documents = await findDocuments({ indexUrl, grandPrixId: event.id, season: event.season, eventName: event.eventName })
  if (!Array.isArray(documents)) throw new TypeError('FIA document discovery did not return a list')
  if (!documents.length) return { status: 'PENDING', needsPipeline: false, grandPrixId: event.id, reason: 'OFFICIAL_DOCUMENT_NOT_PUBLISHED' }
  if (documents.length > 1) return { status: 'AMBIGUOUS', needsPipeline: false, grandPrixId: event.id, documentCount: documents.length }
  const document = documents[0]
  if (checkNow) return { status: 'DOCUMENT_FOUND_DRY_RUN', needsPipeline: false, document }
  if (preflight) return { status: 'READY', needsPipeline: true, grandPrixId: event.id, document }
  if (!publish && !dryRun) return { status: 'DOCUMENT_FOUND_DRY_RUN', needsPipeline: false, document }
  const result = await pipeline({ ...event, indexUrl, documentId: document.documentId }, { publish })
  if (publish && result.status === 'MANUAL_REVIEW_ONLY') throw new Error('PUBLICATION_BLOCKED_MANUAL_REVIEW: official document parsed, but no records passed the existing publication gate; see ingestion/output/manual-review')
  if (result.status === 'NO_DOCUMENT_FOUND') return { ...result, status: 'PENDING', needsPipeline: false, grandPrixId: event.id }
  if (publish && result.status === 'PROCESSED') return { ...result, status: 'READY_TO_PUBLISH', needsPipeline: true, grandPrixId: event.id }
  if (publish && result.status === 'UNCHANGED') return { ...result, status: 'ALREADY_PUBLISHED', needsPipeline: false, grandPrixId: event.id }
  return { ...result, needsPipeline: true, grandPrixId: event.id }
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
async function writeGithubStatus(status, needsPipeline = false, detail = '') {
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `status=${status}\nneeds_pipeline=${needsPipeline}\n`)
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, `\nFIA Auto Publish: **${status}**${detail ? ` — ${detail}` : ''}.\n`)
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const args = Object.fromEntries(process.argv.slice(2).map(arg => arg.replace(/^--/, '').split('=')))
  const at = args.at ? new Date(args.at) : new Date()
  try {
    const resolution = args.resolution ? JSON.parse(await readFile(args.resolution, 'utf8')) : await resolveOfficialCalendar(eventRegistry, { season: defaultSeason(eventRegistry, at), at })
    const result = await runScheduled({ resolution, at, publish: args.publish === 'true', dryRun: args['dry-run'] === 'true', preflight: args.preflight === 'true', checkNow: args['check-now'] === 'true', pipeline: runPipeline })
    await writeGithubStatus(result.status, result.needsPipeline, result.reason)
    console.log(JSON.stringify({ calendar: resolution, discovery: result }, null, 2))
  } catch (error) {
    const message = String(error?.message ?? error).replace(/[\r\n]+/g, ' ').slice(0, 1000)
    await writeGithubStatus('ERROR', false, message)
    console.error(JSON.stringify({ status: 'ERROR', error: message }))
    process.exitCode = 1
  }
}
