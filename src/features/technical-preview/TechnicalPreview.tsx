import { useEffect, useState } from 'react'
import { EventCountdown } from '../../components/dashboard/EventCountdown'
import { InsightPanels } from '../../components/dashboard/InsightPanels'
import { ScoreCard } from '../../components/dashboard/ScoreCard'
import { SectionHeading } from '../../components/dashboard/SectionHeading'
import { TeamBattle } from '../../components/dashboard/TeamBattle'
import { ThreePreview } from '../../components/dashboard/ThreePreview'
import { UpdateCard } from '../../components/dashboard/UpdateCard'
import { PredictionPanel } from '../../components/dashboard/PredictionPanel'
import { DevelopmentRanking } from '../../components/dashboard/DevelopmentRanking'
import { dataStateText, type Locale, t, uiText } from '../../i18n'
import { demoScores, type TechnicalUpdate } from './data'
import { loadPublishedSeason, type PublishedUpdate } from '../../services/fia/published-dataset'
import { teams } from '../teams/data'
import { AdSlot } from '../../components/ads/AdSlot'

const displayTeam = (id: string) => teams.find((team) => team.id === id)?.name ?? id
const previewUpdate = (update: PublishedUpdate): TechnicalUpdate => ({ team: displayTeam(update.teamId), component: update.componentId, status: update.technicalState, objective: update.objective ?? update.sourceText, magnitude: (update.magnitude ?? '—') as TechnicalUpdate['magnitude'], source: 'FIA', confidence: 100 })

export function TechnicalPreview({ locale }: { locale: Locale }) {
  const copy = t(locale).preview
  const [updates, setUpdates] = useState<PublishedUpdate[]>([])
  const [dataState, setDataState] = useState<'fresh' | 'stale' | 'offline' | 'error'>('fresh')
  useEffect(() => { void loadPublishedSeason().then((result) => { setUpdates(result.updates); setDataState(result.stale ? (navigator.onLine ? 'stale' : 'offline') : result.errors.length ? 'error' : 'fresh') }) }, [])
  const teamUpdates = teams.map((team) => ({ team: team.name, updates: updates.filter((update) => update.teamId === team.id).length })).sort((a, b) => b.updates - a.updates || a.team.localeCompare(b.team))
  return <>
    <div className="dashboard__content">
      <section className="dashboard-intro"><div><p className="section-kicker">{copy.eyebrow}</p><h1>{copy.title}<span>.</span></h1><p>{copy.subtitle}</p></div><EventCountdown name={copy.nextEventName} date={copy.date} locale={locale} /></section>
      {dataState !== 'fresh' && <p className="demo-notice" role="status">{dataStateText(locale, dataState)}</p>}
      {updates.length === 0 && <p className="demo-notice">{copy.demo}</p>}
      <TeamBattle teams={teamUpdates} locale={locale} />
      <DevelopmentRanking teams={teamUpdates} locale={locale} />
      <section className="dashboard-section"><SectionHeading title={uiText(locale, 'previewUpdates')} eyebrow={uiText(locale, 'latestUpdates')} /><div className="updates-grid">{updates.map((update) => <UpdateCard key={update.id} update={previewUpdate(update)} locale={locale} />)}</div></section>
      <section className="dashboard-section"><SectionHeading title="F1 TECH Score" eyebrow={uiText(locale, 'comparative')} /><div className="score-grid">{demoScores.map((score) => <ScoreCard key={score.label} {...score} locale={locale} />)}</div></section>
      <InsightPanels locale={locale} />
      <PredictionPanel locale={locale} />
      <AdSlot placementId="technical-preview-inline" />
      <ThreePreview locale={locale} />
    </div>
  </>
}
