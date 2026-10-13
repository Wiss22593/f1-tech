import { useEffect, useState } from 'react'
import { TeamCard } from '../../components/teams/TeamCard'
import { TeamDetail } from '../../components/teams/TeamDetail'
import { teams, type Team } from './data'
import { dataStateText, t, type Locale, uiText } from '../../i18n'
import { loadPublishedSeason, publishedUpdateCounts, type PublishedUpdate } from '../../services/fia/published-dataset'
import { AdSlot } from '../../components/ads/AdSlot'

export function TeamsPage({ locale }: { locale: Locale }) {
  const copy = t(locale)
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [publishedCounts, setPublishedCounts] = useState<Record<string, number>>({})
  const [publishedUpdates, setPublishedUpdates] = useState<PublishedUpdate[]>([])
  const [dataState, setDataState] = useState<'fresh' | 'stale' | 'offline' | 'error'>('fresh')
  useEffect(() => { void loadPublishedSeason().then((result) => { setPublishedUpdates(result.updates); setPublishedCounts(publishedUpdateCounts(result.updates)); setDataState(result.stale ? (navigator.onLine ? 'stale' : 'offline') : result.errors.length ? 'error' : 'fresh') }) }, [])
  const visibleTeams = teams.map((team) => ({ ...team, publishedUpdates: publishedCounts[team.id] ?? 0 }))
  if (selectedTeam) return <TeamDetail team={{ ...selectedTeam, publishedUpdates: publishedCounts[selectedTeam.id] ?? 0 }} updates={publishedUpdates.filter((update) => update.teamId === selectedTeam.id)} locale={locale} onBack={() => setSelectedTeam(null)} />
  return <section className="teams-page dashboard__content" aria-labelledby="teams-title"><div className="teams-page__intro"><div><p className="section-kicker">{uiText(locale, 'teamsKicker')}</p><h1 id="teams-title">{uiText(locale, 'teamsTitle')}<span>.</span></h1><p>{uiText(locale, 'teamsSubtitle')}</p></div><span>11<br /><i>{uiText(locale, 'teamsCount')}</i></span></div>
    {dataState !== 'fresh' && <p className="demo-notice" role="status">{dataStateText(locale, dataState)}</p>}
    <p className="demo-notice"><b>{copy.common.demo}</b>{uiText(locale, 'teamsDemo')}</p>
    <div className="teams-page__grid">{visibleTeams.map((team, index) => <TeamCard key={team.id} team={team} index={index} locale={locale} onSelect={setSelectedTeam} />)}</div><AdSlot placementId="teams-bottom" />
  </section>
}
