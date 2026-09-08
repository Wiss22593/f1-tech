import type { TechnicalUpdate } from '../../features/technical-preview/data'

export function UpdateCard({ update }: { update: TechnicalUpdate }) {
  return <article className="update-card">
    <div className="update-card__top"><span>{update.team}</span><span className={`status status--${update.status.toLowerCase().replace(' ', '-')}`}>{update.status}</span></div>
    <h3>{update.component}</h3><p>{update.objective}</p>
    <dl><div><dt>MAGNITUD</dt><dd>{update.magnitude}</dd></div><div><dt>FUENTE</dt><dd>{update.source}</dd></div></dl>
    <div className="confidence"><span>CONFIANZA</span><div><i style={{ width: `${update.confidence}%` }} /></div><b>{update.confidence}%</b></div>
  </article>
}
