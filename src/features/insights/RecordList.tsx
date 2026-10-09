import { localizeFiaUpdate } from '../../services/fia/localization.mjs'
import type { PublishedUpdate } from '../../services/fia/published-dataset'
import { teams } from '../teams/data'
import { grandsPrix } from '../../data/grands-prix'
import type { Locale } from '../../i18n'
import { insightText as text } from './copy'
export function RecordList({records,locale}:{records:PublishedUpdate[];locale:Locale}) {
 return <div className="atlas-records">{records.map(r=>{const c=localizeFiaUpdate(r,locale);return <details key={r.grandPrixId+':'+r.id} className="atlas-record card" id={'record-'+r.id}><summary><span>{teams.find(t=>t.id===r.teamId)?.name??r.teamId}<small>{grandsPrix.find(g=>g.id===r.grandPrixId)?.name??r.grandPrixId}</small></span><strong>{c.componentLabel}</strong><span className="atlas-reason">{c.primaryReason||text(locale,'unspecified')}</span></summary><div className="atlas-record-body"><dl>{[[text(locale,'reason'),c.primaryReason],[text(locale,'geometry'),c.geometricDifference],[text(locale,'description'),c.briefDescription||c.summary]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value||text(locale,'unspecified')}</dd></div>)}</dl><a href={r.sourceUrl+(r.sourcePage?'#page='+r.sourcePage:'')} target="_blank" rel="noopener noreferrer">{text(locale,'source')} ↗</a><small>{r.sourceDocument}{r.sourcePage?' · p. '+r.sourcePage:''}</small></div></details>})}</div>
}
