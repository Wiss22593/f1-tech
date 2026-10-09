import type { Team } from '../../features/teams/data'
import { type Locale, uiText } from '../../i18n'
import type { PublishedUpdate } from '../../services/fia/published-dataset'
import { showroomTeams } from '../../features/garage/showroom'
import { insightText as text } from '../../features/insights/copy'
import { RecordList } from '../../features/insights/RecordList'
import { familyKey, uniqueRecords } from '../../features/insights/analytics.mjs'
export function TeamDetail({team,updates,onBack,locale}:{team:Team;updates:PublishedUpdate[];onBack:()=>void;locale:Locale}) {
 const records=uniqueRecords(updates),roster=showroomTeams[team.id]
 return <section className="atlas-page dashboard__content"><button className="atlas-more" onClick={onBack}>← {uiText(locale,'backTeams')}</button><header className="atlas-hero"><div><p className="section-kicker">{team.season} / {roster.carName}</p><h1>{team.name}<span>.</span></h1><div className="engineering-roster">{roster.drivers.map(d=><a key={d.id} href={'/inicio?team='+team.id+'&driver='+d.id}><b>{d.number}</b> {d.name} ↗</a>)}</div></div></header><section className="atlas-stats">{[[records.length,text(locale,'records')],[new Set(records.map(familyKey)).size,text(locale,'families')],[new Set(records.map(r=>r.grandPrixId)).size,text(locale,'events')]].map(([n,label])=><div key={label} className="card"><strong>{n}</strong><span>{label}</span></div>)}</section><p className="atlas-notice">{text(locale,'methodology')}</p><nav className="atlas-nav"><a href={'/actualizaciones?team='+team.id}>{text(locale,'history')}</a><a href={'/inicio?team='+team.id}>{text(locale,'garage')}</a><a href={'/pilotos?team='+team.id}>{text(locale,'drivers')}</a></nav><h2>{text(locale,'records')}</h2>{records.length?<RecordList records={records} locale={locale}/>:<p className="atlas-empty card">{text(locale,'empty')}</p>}</section>
}
