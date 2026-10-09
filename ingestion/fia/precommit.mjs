import { execFileSync } from 'node:child_process'
import { appendFile, readFile } from 'node:fs/promises'
import { eventRegistry } from './events.mjs'
import { validateAutoPublishDataset } from './dataset-validation.mjs'
const path = process.env.DATASET_PATH
if (!/^public\/data\/grands-prix\/\d{4}\/[a-z0-9-]+\.json$/.test(path ?? '')) throw new Error('INVALID_DATASET_PATH')
execFileSync('git', ['fetch', '--no-tags', 'origin', 'main'], { stdio: 'inherit' })
const remote = execFileSync('git', ['rev-parse', 'FETCH_HEAD'], { encoding: 'utf8' }).trim()
const head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
let current
try { current = JSON.parse(execFileSync('git', ['show', `${remote}:${path}`], { encoding: 'utf8', stdio: ['ignore','pipe','ignore'] })) } catch { current = null }
const candidate = JSON.parse(await readFile(path, 'utf8'))
const complete = current && validateAutoPublishDataset(current, path, eventRegistry).valid
  && current.grandPrix.startDate === candidate.grandPrix.startDate && current.grandPrix.endDate === candidate.grandPrix.endDate
  && current.validation.manualReview === 0 && current.validation.recordsReceived === current.updates.length
if (!complete && remote !== head) throw new Error('MAIN_CHANGED_RETRY_NEXT_CRON: no commit created; never overwrite concurrent changes')
if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `commit=${!complete}\n`)
console.log(complete ? 'ALREADY_PUBLISHED_ON_REMOTE: no duplicate commit' : 'REMOTE_UNCHANGED: commit allowed')
