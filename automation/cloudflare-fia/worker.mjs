import { DurableObject } from 'cloudflare:workers'
import { resolveOfficialCalendar } from '../../ingestion/fia/official-calendar.mjs'
import { defaultSeason } from '../../src/domain/calendar.mjs'
import registry2026 from '../../data/grands-prix/2026.json' with { type: 'json' }
import snapshot2026 from '../../ingestion/fia/calendars/2026.json' with { type: 'json' }
import { tick } from './core.mjs'

const registry = registry2026.map(e => ({ ...e, id: e.grandPrixId, status: e.ingestionStatus === 'CANCELLED' ? 'cancelled' : 'scheduled' }))
export class DispatchGate extends DurableObject {
  async fetch() {
    const now = Date.now(), correlation = crypto.randomUUID()
    // Atomic, persistent lease; survives isolate restarts. Expired lease recovers a crashed invocation.
    const acquired = await this.ctx.storage.transaction(async txn => {
      const next = await txn.get('next') ?? 0
      if (next > now) return false
      await txn.put('next', now + 300000)
      return true
    })
    if (!acquired) return Response.json({ status: 'COOLDOWN' })
    let result
    try {
      result = await tick(this.env, { at: new Date(now), resolveCalendar: at => resolveOfficialCalendar(registry, {
        season: defaultSeason(registry, at), at, trigger: 'cloudflare-cron',
        snapshotLoader: async season => {
          if (season !== snapshot2026.season) throw new Error('UNSUPPORTED_CALENDAR_SEASON')
          return snapshot2026
        },
      }) })
      await this.ctx.storage.put('failures', 0)
      await this.ctx.storage.put('next', now + 540000)
      if (result.previousFailed || result.overdue) await this.alert(result.overdue ? 'DOCUMENT_OR_PUBLICATION_OVERDUE' : 'GITHUB_RUN_FAILED', now, correlation)
    } catch (error) {
      const failures = (await this.ctx.storage.get('failures') ?? 0) + 1
      await this.ctx.storage.put('failures', failures)
      // 403/404 configuration errors back off; 429 respects reset/retry-after; transient errors recover next ticks.
      const delay = [403,404].includes(error.status) ? 3600000 : Math.min(3600000, 600000 * 2 ** Math.min(failures - 1, 3))
      await this.ctx.storage.put('next', Math.max(now + delay, error.retryAt ?? 0))
      result = { status: 'ERROR', code: error.status ? `GITHUB_HTTP_${error.status}` : 'TRIGGER_FAILED' }
      await this.alert(result.code, now, correlation)
    }
    console.log(JSON.stringify({ correlation, at: new Date(now).toISOString(), ...result }))
    if (result.status === 'ERROR') throw new Error(result.code)
    return Response.json(result)
  }
  async alert(code, now, correlation) {
    const last = await this.ctx.storage.get(`alert:${code}`) ?? 0
    if (now - last < 21600000) return
    // Private generic webhook JSON. Configure an adapter for the selected notification provider.
    if (!this.env.ALERT_WEBHOOK) { console.error(JSON.stringify({ code: 'ALERT_CHANNEL_NOT_CONFIGURED', correlation })); return }
    try {
      if (new URL(this.env.ALERT_WEBHOOK).protocol !== 'https:') throw new Error('INVALID_ALERT_URL')
      const response = await fetch(this.env.ALERT_WEBHOOK, { method: 'POST', redirect: 'error',
        signal: AbortSignal.timeout(8000), headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: `F1 TECH: ${code}. Correlation ${correlation}. Check Cloudflare logs and GitHub Actions.` }) })
      if (!response.ok) throw new Error('ALERT_FAILED')
      await this.ctx.storage.put(`alert:${code}`, now)
    } catch { console.error(JSON.stringify({ code: 'ALERT_DELIVERY_FAILED', correlation })) }
  }
}
export default {
  async scheduled(controller, env, ctx) {
    // No HTTP route exists; the DO is accessible only through this private binding.
    ctx.waitUntil(env.GATE.get(env.GATE.idFromName('fia-main')).fetch('https://internal/cron').then(response => {
      if (!response.ok) throw new Error('GATE_FAILED')
    }))
  },
}
