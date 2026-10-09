import type { CSSProperties } from 'react'
import type { Team } from '../../features/teams/data'
import { type Locale, uiText } from '../../i18n'
import { showroomTeams } from '../../features/garage/showroom'
import { teamThemes } from '../../features/garage/data'
import { insightText as text } from '../../features/insights/copy'
export function TeamCard({team,index,onSelect,locale,loading=false}:{team:Team;index:number;onSelect:(team:Team)=>void;locale:Locale;loading?:boolean}) {
 const roster=showroomTeams[team.id]
 return <button className="engineering-team card" style={{'--team-color':teamThemes[team.id].accent} as CSSProperties} onClick={()=>onSelect(team)}>
 <span className="engineering-team-top"><span>{String(index+1).padStart(2,'0')} / {team.season}</span><span>{roster.carName}</span></span>
 <h2>{team.name}</h2><div className="engineering-roster">{roster.drivers.map(d=><span key={d.id}><b>{d.number}</b>{d.shortName}</span>)}</div>
 <div className="engineering-concept" aria-hidden="true"><span>{roster.carName}</span><svg viewBox="0 0 420 150" fill="none"><path d="M30 112H388M60 98L113 91L149 64H216L247 84L304 92L348 97L362 111H52Z" fill="currentColor" fillOpacity=".14" stroke="currentColor" strokeWidth="2"/><path d="M106 83L139 54H165L158 85M206 64L218 46H245L254 81M318 90V55H350V94M48 105H84M165 89H280M145 68H213" stroke="currentColor"/><circle cx="112" cy="109" r="25" fill="#10131b" stroke="currentColor" strokeWidth="3"/><circle cx="306" cy="109" r="25" fill="#10131b" stroke="currentColor" strokeWidth="3"/><circle cx="112" cy="109" r="13" stroke="currentColor"/><circle cx="306" cy="109" r="13" stroke="currentColor"/></svg></div>
 <small>{text(locale,'sketch')}</small><span className="engineering-team-footer"><span><b>{loading?'—':team.publishedUpdates??0}</b> {text(locale,'records')}</span><span>{uiText(locale,'viewProfile')} →</span></span>
 </button>
}

