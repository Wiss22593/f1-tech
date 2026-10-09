import test from 'node:test'
import assert from 'node:assert/strict'
import { Miniflare, convertV4MiniflareOptions } from 'miniflare'

test('real SQLite Durable Object serializes duplicate ticks and retains cooldown across reload', async () => {
  const options = { modules: true, scriptPath: new URL('./dist/worker.js', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1'),
    compatibilityDate: '2026-10-09', compatibilityFlags: ['nodejs_compat'],
    durableObjects: { GATE: { className: 'DispatchGate', useSQLite: true } } }
  const mf = new Miniflare(convertV4MiniflareOptions({ workers: [options] }))
  try {
    const ns = await mf.getDurableObjectNamespace('GATE')
    const stub = ns.get(ns.idFromName('fia-main'))
    const results = await Promise.allSettled([stub.fetch('https://internal/cron'), stub.fetch('https://internal/cron')])
    assert.equal(results.filter(r=>r.status==='rejected').length, 1)
    const fulfilled = results.find(r=>r.status==='fulfilled')
    assert.equal((await fulfilled.value.json()).status,'COOLDOWN')
    await mf.setOptions(convertV4MiniflareOptions({ workers: [options] }))
    const reloaded = await mf.getDurableObjectNamespace('GATE')
    assert.equal((await (await reloaded.get(reloaded.idFromName('fia-main')).fetch('https://internal/cron')).json()).status,'COOLDOWN')
  } finally { await mf.dispose() }
})
