import { useMemo, useState } from 'react'
import { demoGrandPrix, demoTeamUpdates, updateAreas, updateStatuses, type TechnicalArea, type UpdateStatus } from './data'

type FilterValue<T extends string> = T | 'Todos'

function statusClass(status: UpdateStatus) {
  return status.toLowerCase().replace('_', '-')
}

export function UpdatesPage() {
  const [team, setTeam] = useState<FilterValue<string>>('Todos')
  const [status, setStatus] = useState<FilterValue<UpdateStatus>>('Todos')
  const [area, setArea] = useState<FilterValue<TechnicalArea>>('Todos')
  const teams = [...new Set(demoTeamUpdates.map((update) => update.team))]
  const visibleUpdates = useMemo(() => demoTeamUpdates.filter((update) =>
    (team === 'Todos' || update.team === team) &&
    (status === 'Todos' || update.state === status) &&
    (area === 'Todos' || update.area === area)
  ), [team, status, area])

  return <section className="updates-page dashboard__content" aria-labelledby="updates-title">
    <header className="updates-page__hero">
      <div><p className="section-kicker">TECHNICAL PREVIEW · ENTORNO DEMO</p><h1 id="updates-title">Actualiza<span>ciones.</span></h1><p>La mesa de lectura previa al GP: cada señal técnica se ordena por equipo, estado, área, objetivo y nivel de confianza.</p></div>
      <aside className="updates-event-card card"><span>PRÓXIMO EVENTO</span><strong>{demoGrandPrix.name}</strong><p>{demoGrandPrix.circuit}</p><b>{demoGrandPrix.timing}</b></aside>
    </header>

    <p className="demo-notice"><b>DATOS DEMO</b> {demoGrandPrix.description} Ningún estado, puntuación, ajuste de circuito o fuente de esta vista corresponde a información oficial.</p>

    <section className="updates-preview card" aria-label="Resumen del Technical Preview">
      <div><span>ACTUALIZACIONES EN LECTURA</span><strong>{demoTeamUpdates.length} <em>DEMO</em></strong></div>
      <div><span>F1 TECH SCORE</span><strong>— <em>DEMO</em></strong></div>
      <div><span>CIRCUIT FIT</span><strong>— <em>DEMO</em></strong></div>
      <div><span>FUENTES VERIFICADAS</span><strong>0 <em>DEMO</em></strong></div>
    </section>

    <section className="updates-controls" aria-label="Filtros de actualizaciones">
      <label>EQUIPO<select value={team} onChange={(event) => setTeam(event.target.value)}><option>Todos</option>{teams.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label>ESTADO<select value={status} onChange={(event) => setStatus(event.target.value as FilterValue<UpdateStatus>)}><option>Todos</option>{updateStatuses.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label>ÁREA<select value={area} onChange={(event) => setArea(event.target.value as FilterValue<TechnicalArea>)}><option>Todos</option>{updateAreas.map((item) => <option key={item}>{item}</option>)}</select></label>
      <button type="button" onClick={() => { setTeam('Todos'); setStatus('Todos'); setArea('Todos') }}>LIMPIAR FILTROS</button>
    </section>

    <div className="updates-page__result"><p>REGISTROS MOSTRADOS <b>{visibleUpdates.length.toString().padStart(2, '0')}</b></p><span>FUENTES Y MÉTRICAS · DEMO</span></div>
    <div className="updates-page__grid">
      {visibleUpdates.map((update) => <article className="technical-update-card card" key={update.id}>
        <header><span>{update.team} · {update.area}</span><b className={`status status--${statusClass(update.state)}`}>{update.state.replace('_', ' ')}</b></header>
        <h2>{update.component}</h2><p>{update.objective}</p>
        <dl><div><dt>MAGNITUD</dt><dd>{update.magnitude}</dd></div><div><dt>F1 TECH SCORE</dt><dd>{update.f1TechScore} <em>DEMO</em></dd></div><div><dt>CIRCUIT FIT</dt><dd>{update.circuitFit} <em>DEMO</em></dd></div></dl>
        <footer><span>FUENTE · {update.source}</span><div className="confidence"><b>{update.confidence}</b></div></footer>
      </article>)}
    </div>
    {visibleUpdates.length === 0 && <div className="updates-page__empty card">No hay registros DEMO con esta combinación de filtros.</div>}
  </section>
}
