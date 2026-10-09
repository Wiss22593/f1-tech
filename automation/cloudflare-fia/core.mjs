import { validateAutoPublishDataset } from '../../ingestion/fia/dataset-validation.mjs'
export const repository = 'Wiss22593/f1-tech'
export const workflow = 'fia-auto-publish.yml'
export class ApiError extends Error {
  constructor(status, retryAt = 0) { super(`GITHUB_HTTP_${status}`); this.status = status; this.retryAt = retryAt }
}
export async function github(path, token, { fetchFn = fetch, method = 'GET', body, now = Date.now() } = {}) {
  const response = await fetchFn(`https://api.github.com/repos/${repository}/${path}`, {
    method, redirect: 'error', signal: AbortSignal.timeout(12000),
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'f1-tech-fia-trigger', 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  if (!response.ok) {
    const retry = response.headers.get('retry-after')
    const retryAt = retry ? (Number.isFinite(Number(retry)) ? now + Number(retry) * 1000 : Date.parse(retry)) : 0
    const reset = Number(response.headers.get('x-ratelimit-reset')) * 1000
    throw new ApiError(response.status, Math.max(retryAt || 0, response.headers.get('x-ratelimit-remaining') === '0' ? reset : 0))
  }
  return response.status === 204 ? null : response.json()
}
export function published(dataset, event) {
  try {
    const d = dataset, hash = d.sourceDocument.documentHash, source = new URL(d.sourceDocument.sourceUrl)
    const updates = d.updates
    return validateAutoPublishDataset(d, `public/data/grands-prix/${event.season}/${event.id}.json`, [event]).valid && d.season === event.season && d.grandPrix.id === event.id
      && d.grandPrix.startDate === event.startDate && d.grandPrix.endDate === event.endDate
      && source.protocol === 'https:' && (source.hostname === 'fia.com' || source.hostname.endsWith('.fia.com'))
      && /car\s+presentation\s+submissions?/i.test(d.sourceDocument.title) && /^[a-f0-9]{64}$/i.test(hash)
      && Array.isArray(updates) && updates.length > 0 && new Set(updates.map(r => r.id)).size === updates.length
      && updates.every(r => r.id && r.validationState === 'published' && r.contentHash === hash)
      && d.validation.recordsPublished === updates.length && d.validation.recordsReceived === updates.length && d.validation.manualReview === 0
  } catch { return false }
}
export async function tick(env, { at = new Date(), resolveCalendar, fetchFn = fetch } = {}) {
  if (!env.GITHUB_TOKEN) throw new Error('MISSING_GITHUB_TOKEN')
  const resolution = await resolveCalendar(at)
  if (!resolution.event || !resolution.relevant) {
    if (resolution.status === 'MANUAL_REVIEW') throw new Error('OFFICIAL_CALENDAR_REQUIRES_REVIEW')
    return { status: 'OUTSIDE_WINDOW' }
  }
  const event = resolution.event
  const api = (path, options) => github(path, env.GITHUB_TOKEN, { fetchFn, now: at.getTime(), ...options })
  const ref = await api('git/ref/heads/main')
  let data
  try { data = await api(`contents/public/data/grands-prix/${event.season}/${event.id}.json?ref=${ref.object.sha}`) }
  catch (error) { if (error.status !== 404) throw error }
  if (data) {
    let decoded
    try { decoded = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(data.content.replace(/\s/g, '')), c => c.charCodeAt(0)))) } catch { decoded = null }
    if (published(decoded, event)) return { status: 'ALREADY_PUBLISHED', event: event.id, sha: ref.object.sha }
  }
  const runs = await api(`actions/workflows/${workflow}/runs?branch=main&per_page=30`)
  if (runs.workflow_runs.some(run => run.status !== 'completed')) return { status: 'RUN_ACTIVE', event: event.id }
  const last = runs.workflow_runs[0]
  // POST timeout is ambiguous. Never retry it here; next cron reconciles GitHub runs first.
  await api(`actions/workflows/${workflow}/dispatches`, { method: 'POST', body: { ref: 'main' } })
  return { status: 'DISPATCH_ACCEPTED', event: event.id, previousFailed: last?.conclusion === 'failure',
    overdue: at.getTime() > Date.parse(event.fp1.utc) + 4 * 3600000 }
}
