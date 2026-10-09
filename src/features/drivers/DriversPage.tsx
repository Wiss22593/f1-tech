import { useState, type CSSProperties } from 'react'
import { type Locale, uiText } from '../../i18n'
import { teams } from '../teams/data'
import { showroomTeams, isDriverAvailable } from '../garage/showroom'
import { teamThemes } from '../garage/data'
import { insightText as text } from '../insights/copy'
export function DriversPage({locale}:{locale:Locale}) {
 const [team,setTeam]=useState(()=>new URLSearchParams(location.search).get('team')||'')
 const roster=teams.filter(t=>!team||t.id===team).flatMap(t=>showroomTeams[t.id].drivers.map(driver=>({driver,team:t})))
 return <section className="atlas-page dashboard__content"><nav className="atlas-nav"><a href="/actualizaciones">{uiText(locale,'updatesTitle')}</a><a href="/equipos">{uiText(locale,'teamsTitle')}</a><a href="/pilotos" aria-current="page">{text(locale,'drivers')}</a></nav><header className="atlas-hero"><div><p className="section-kicker">2026 / DRIVER INDEX</p><h1>{text(locale,'drivers')}<span>.</span></h1><p>{text(locale,'roster')}</p></div><span className="atlas-season">22</span></header><div className="atlas-filters card"><label>{uiText(locale,'team')}<select value={team} onChange={e=>setTeam(e.target.value)}><option value="">{uiText(locale,'all')}</option>{teams.map(t=><option value={t.id} key={t.id}>{t.name}</option>)}</select></label><span>{roster.length} / 22</span></div><div className="engineering-grid">{roster.map(({driver:d,team:t})=><article key={d.id} className="engineering-driver card" style={{'--team-color':teamThemes[t.id].accent} as CSSProperties}><div className="engineering-driver-top"><span>{t.name}</span><span>2026</span></div><span className="engineering-driver-number" aria-hidden="true">{String(d.number).padStart(2,'0')}</span><div className="engineering-driver-identity"><span>#{d.number} / {showroomTeams[t.id].carName}</span><h2>{d.name}</h2></div><div className="engineering-driver-monogram" aria-hidden="true">{d.name.split(' ').map(n=>n[0]).join('')}</div><footer><a href={'/equipos?team='+t.id}>{uiText(locale,'viewProfile')} →</a>{isDriverAvailable(d)&&<a href={'/inicio?team='+t.id+'&driver='+d.id}>{text(locale,'garage')} ↗</a>}</footer></article>)}</div></section>
}
