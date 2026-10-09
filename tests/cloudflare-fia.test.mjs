import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { tick, github, published } from '../automation/cloudflare-fia/core.mjs'
import { watchDecision } from '../src/domain/calendar.mjs'
const data = JSON.parse(await readFile(new URL('../public/data/grands-prix/2026/azerbaijan-2026.json', import.meta.url), 'utf8'))
const event = { ...data.grandPrix, id: 'azerbaijan-2026', season: 2026, fp1: { utc: '2026-03-06T01:30:00Z', timeZone: 'Australia/Melbourne' } }
const response = (value, status = 200, headers = {}) => new Response(status === 204 ? null : JSON.stringify(value), { status, headers })
const env = { GITHUB_TOKEN: 'test-only' }
function setup({ dataset, active = false, postStatus = 204 } = {}) {
  const calls = []
  const fetchFn = async (url, options) => {
    calls.push({ url, options })
    if (url.includes('git/ref')) return response({ object: { sha: 'abc' } })
    if (url.includes('contents/')) return dataset ? response({ content: Buffer.from(JSON.stringify(dataset)).toString('base64') }) : response({},404)
    if (url.includes('/runs')) return response({ workflow_runs: active ? [{ status: 'in_progress' }] : [] })
    return response({}, postStatus)
  }
  return { calls, fetchFn, resolveCalendar: async () => ({ relevant: true, event }) }
}
test('missing token fails before requests', async () => { await assert.rejects(tick({}, setup()), /MISSING_GITHUB_TOKEN/) })
test('outside GP window makes no GitHub requests', async () => {
  const deps = setup(); deps.resolveCalendar = async () => ({ relevant: false })
  assert.equal((await tick(env,deps)).status, 'OUTSIDE_WINDOW'); assert.equal(deps.calls.length,0)
})
test('valid dataset suppresses dispatch; malformed and partial data do not', () => {
  assert.equal(published(data,event),true)
  for (const bad of [{}, { ...data, validation: {} }, { ...data, updates: [] }, { ...data, sourceDocument: { ...data.sourceDocument, sourceUrl: 'https://example.com/a.pdf' } }]) assert.equal(published(bad,event),false)
})
test('published dataset only reads ref and immutable data', async () => {
  const deps = setup({dataset:data}); assert.equal((await tick(env,deps)).status,'ALREADY_PUBLISHED'); assert.equal(deps.calls.length,2)
})
test('pending GP dispatches exact existing workflow on main', async () => {
  const deps = setup(); assert.equal((await tick(env,deps)).status,'DISPATCH_ACCEPTED')
  const post = deps.calls.at(-1); assert.equal(post.options.method,'POST'); assert.deepEqual(JSON.parse(post.options.body),{ref:'main'})
  assert.match(post.url,/actions\/workflows\/fia-auto-publish.yml\/dispatches$/)
})
test('active GitHub cron or prior external run suppresses overlapping dispatch', async () => {
  const deps = setup({active:true}); assert.equal((await tick(env,deps)).status,'RUN_ACTIVE'); assert.equal(deps.calls.length,3)
})
for (const status of [403,404,429,500]) test(`dispatch ${status} fails without reporting publication or repeating POST`, async () => {
  const deps = setup({postStatus:status}); await assert.rejects(tick(env,deps),new RegExp(`GITHUB_HTTP_${status}`))
  assert.equal(deps.calls.filter(c=>c.options.method==='POST').length,1)
})
test('429 Retry-After and rate reset are retained', async () => {
  await assert.rejects(github('anything','test',{now:1000,fetchFn:async()=>response({},429,{'retry-after':'120','x-ratelimit-remaining':'0','x-ratelimit-reset':'300'})}),error=>error.retryAt===300000)
})
test('Singapore catchup and Argentina/UTC instants use same extended watch window', () => {
  const e = {id:'singapore-2026',endDate:'2026-10-11',fp1:{utc:'2026-10-09T08:30:00Z',timeZone:'Asia/Singapore'}}
  assert.equal(watchDecision(e,new Date('2026-10-06T08:30:00Z')).relevant,true)
  assert.equal(watchDecision(e,new Date('2026-10-12T12:00:00Z')).relevant,true)
  assert.deepEqual(watchDecision(e,new Date('2026-10-09T13:00:00Z')),watchDecision(e,new Date('2026-10-09T10:00:00-03:00')))
  assert.equal(watchDecision(e,new Date('2026-10-14T00:00:00Z')).relevant,false)
})
