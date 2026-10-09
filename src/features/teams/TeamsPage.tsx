import { useState } from 'react'
import { TeamCard } from '../../components/teams/TeamCard'
import { TeamDetail } from '../../components/teams/TeamDetail'
import { teams, type Team } from './data'
import { type Locale, uiText, dataStateText } from '../../i18n'
import { AdSlot } from '../../components/ads/AdSlot'
import { useSeasonRecords } from '../insights/useSeasonRecords'
import { insightText as text } from '../insights/copy'
export function TeamsPage({locale}:{locale:Locale}) {
 const [selectedTeam,setSelectedTeam]=useState<Team|null>(()=>teams.find(t=>t.id===new URLSearchParams(location.search).get('team'))??null)
 const {records,loading,partial,dataState}=useSeasonRecords()
 function select(team:Team|null) { const url=new URL(location.href);if(team)url.searchParams.set('team',team.id);else url.searchParams.delete('team');history.replaceState({},'',url);setSelectedTeam(team) }
 if(selectedTeam)return <TeamDetail team={selectedTeam} updates={records.filter(r=>r.teamId===selectedTeam.id)} locale={locale} onBack={()=>select(null)}/>
 return <section className="atlas-page dashboard__content"><nav className="atlas-nav"><a href="/actualizaciones">{uiText(locale,'updatesTitle')}</a><a href="/equipos" aria-current="page">{uiText(locale,'teamsTitle')}</a><a href="/pilotos">{text(locale,'drivers')}</a></nav><header className="atlas-hero"><div><p className="section-kicker">2026 / CONSTRUCTORS</p><h1>{uiText(locale,'teamsTitle')}<span>.</span></h1><p>{text(locale,'roster')}</p></div><span className="atlas-season">11</span></header>{loading||partial?<p className="atlas-notice" role="status">{loading?text(locale,'loading'):dataStateText(locale,dataState==='fresh'?'error':dataState)}</p>:null}<div className="engineering-grid">{teams.map((team,index)=><TeamCard key={team.id} team={{...team,publishedUpdates:records.filter(r=>r.teamId===team.id).length}} index={index} loading={loading} locale={locale} onSelect={select}/>)}</div><AdSlot locale={locale} placementId="teams-bottom"/></section>
}


