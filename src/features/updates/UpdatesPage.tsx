import { useEffect, useMemo, useState } from 'react'
import { demoGrandPrix, type UpdateStatus } from './data'
import { dataStateText, t, type Locale, technicalText, uiText } from '../../i18n'
import { loadPublishedSeason, type PublishedUpdate } from '../../services/fia/published-dataset'
import { teams } from '../teams/data'
import { grandsPrix2026 } from '../../data/grands-prix/2026'
import { AdSlot } from '../../components/ads/AdSlot'

type FilterValue<T extends string> = T | 'Todos'
type PublicUpdateView = { id: string; grandPrixId: string; team: string; state: UpdateStatus; area: string; component: string; objective: string; magnitude: string; source: string }

function statusClass(status: UpdateStatus) {
  return status.toLowerCase().replace('_', '-')
}

export function UpdatesPage({ locale }: { locale: Locale }) {
  const copy = t(locale)
  const summaryLabel: Record<Locale, string> = { es: 'Resumen del Technical Preview', en: 'Technical Preview summary', it: 'Riepilogo dell’anteprima tecnica', pt: 'Resumo da prévia técnica', fr: 'Résumé de l’aperçu technique', de: 'Zusammenfassung der technischen Vorschau' }
  const [team, setTeam] = useState<FilterValue<string>>('Todos')
  const [grandPrixId, setGrandPrixId] = useState<FilterValue<string>>('Todos')
  const [component, setComponent] = useState<FilterValue<string>>('Todos')
  const [status, setStatus] = useState<FilterValue<UpdateStatus>>('Todos')
  const [area, setArea] = useState<FilterValue<string>>('Todos')
  const [publishedUpdates, setPublishedUpdates] = useState<PublishedUpdate[]>([])
  const [dataState, setDataState] = useState<'fresh' | 'stale' | 'offline' | 'error'>('fresh')
  useEffect(() => { void loadPublishedSeason().then((result) => { setPublishedUpdates(result.updates); setDataState(result.stale ? (navigator.onLine ? 'stale' : 'offline') : result.errors.length ? 'error' : 'fresh') }) }, [])
  const records: PublicUpdateView[] = publishedUpdates.map((update) => ({ id: update.id, grandPrixId: update.grandPrixId, team: teams.find((item) => item.id === update.teamId)?.name ?? update.teamId, state: update.technicalState, area: update.area ?? '—', component: update.componentId, objective: update.objective ?? update.sourceText, magnitude: update.magnitude ?? '—', source: 'FIA' }))
  const teamNames = [...new Set(records.map((update) => update.team))]
  const grandPrixIds = [...new Set(records.map((update) => update.grandPrixId))]
  const components = [...new Set(records.map((update) => update.component))]
  const areas = [...new Set(records.map((update) => update.area))]
  const statuses = [...new Set(records.map((update) => update.state))]
  const visibleUpdates = useMemo(() => records.filter((update) =>
    (team === 'Todos' || update.team === team) && (grandPrixId === 'Todos' || update.grandPrixId === grandPrixId) && (component === 'Todos' || update.component === component) && (status === 'Todos' || update.state === status) && (area === 'Todos' || update.area === area)
  ), [records, team, grandPrixId, component, status, area])

  return <section className="updates-page dashboard__content" aria-labelledby="updates-title">
    <header className="updates-page__hero">
      <div><p className="section-kicker">{uiText(locale, 'updatesKicker')}</p><h1 id="updates-title">{uiText(locale, 'updatesTitle')}<span>.</span></h1><p>{uiText(locale, 'updatesSubtitle')}</p></div>
      <aside className="updates-event-card card"><span>{uiText(locale, 'nextEvent')}</span><strong>{demoGrandPrix.name}</strong><p>{demoGrandPrix.circuit}</p><b>{demoGrandPrix.timing}</b></aside>
    </header>

    {dataState !== 'fresh' && <p className="demo-notice" role="status">{dataStateText(locale, dataState)}</p>}
    {records.length === 0 && <p className="demo-notice">{uiText(locale, 'noRecords')}</p>}

    <section className="updates-preview card" aria-label={summaryLabel[locale]}>
      <div><span>{uiText(locale, 'readingUpdates')}</span><strong>{records.length}</strong></div>
      <div><span>F1 TECH SCORE</span><strong>— <em>{copy.common.demo}</em></strong></div>
      <div><span>{uiText(locale, 'circuitFit')}</span><strong>— <em>{copy.common.demo}</em></strong></div>
      <div><span>{uiText(locale, 'verifiedSources')}</span><strong>{records.length ? 'FIA' : '—'}</strong></div>
    </section>

    <section className="updates-controls" aria-label={uiText(locale, 'filters')}>
      <label>{dataStateText(locale, 'grandPrix')}<select value={grandPrixId} onChange={(event) => setGrandPrixId(event.target.value)}><option value="Todos">{uiText(locale, 'all')}</option>{grandPrixIds.map((id) => <option key={id} value={id}>{grandsPrix2026.find((item) => item.id === id)?.name ?? id}</option>)}</select></label>
      <label>{uiText(locale, 'team')}<select value={team} onChange={(event) => setTeam(event.target.value)}><option value="Todos">{uiText(locale, 'all')}</option>{teamNames.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      <label>{dataStateText(locale, 'component')}<select value={component} onChange={(event) => setComponent(event.target.value)}><option value="Todos">{uiText(locale, 'all')}</option>{components.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      <label>{uiText(locale, 'state')}<select value={status} onChange={(event) => setStatus(event.target.value as FilterValue<UpdateStatus>)}><option value="Todos">{uiText(locale, 'all')}</option>{statuses.map((item) => <option key={item} value={item}>{technicalText(locale, item)}</option>)}</select></label>
      <label>{uiText(locale, 'area')}<select value={area} onChange={(event) => setArea(event.target.value)}><option value="Todos">{uiText(locale, 'all')}</option>{areas.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      <button type="button" onClick={() => { setGrandPrixId('Todos'); setTeam('Todos'); setComponent('Todos'); setStatus('Todos'); setArea('Todos') }}>{uiText(locale, 'clearFilters')}</button>
    </section>

    <div className="updates-page__result"><p>{uiText(locale, 'shownRecords')} <b>{visibleUpdates.length.toString().padStart(2, '0')}</b></p><span>{uiText(locale, 'sourcesMetrics')}</span></div>
    <div className="updates-page__grid">
      {visibleUpdates.map((update) => <article className="technical-update-card card" key={update.id}>
        <header><span>{update.team} · {update.area}</span><b className={`status status--${statusClass(update.state)}`}>{technicalText(locale, update.state)}</b></header>
        <h2>{update.component}</h2><p>{update.objective}</p>
        <dl><div><dt>{uiText(locale, 'magnitude')}</dt><dd>{update.magnitude}</dd></div><div><dt>F1 TECH SCORE</dt><dd>—</dd></div><div><dt>{uiText(locale, 'circuitFit')}</dt><dd>—</dd></div></dl>
        <footer><span>{uiText(locale, 'source')} · {update.source}</span></footer>
      </article>)}
    </div>
    {visibleUpdates.length === 0 && <div className="updates-page__empty card">{uiText(locale, 'noRecords')}</div>}
    <AdSlot placementId="updates-bottom" />
  </section>
}
