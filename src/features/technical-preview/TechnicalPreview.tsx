import { EventCountdown } from '../../components/dashboard/EventCountdown'
import { InsightPanels } from '../../components/dashboard/InsightPanels'
import { ScoreCard } from '../../components/dashboard/ScoreCard'
import { SectionHeading } from '../../components/dashboard/SectionHeading'
import { TeamBattle } from '../../components/dashboard/TeamBattle'
import { ThreePreview } from '../../components/dashboard/ThreePreview'
import { UpdateCard } from '../../components/dashboard/UpdateCard'
import { PredictionPanel } from '../../components/dashboard/PredictionPanel'
import { DevelopmentRanking } from '../../components/dashboard/DevelopmentRanking'
import { type Locale, t } from '../../i18n'
import { demoScores, demoTeams, demoUpdates } from './data'

export function TechnicalPreview({ locale }: { locale: Locale }) {
  const copy = t(locale).preview
  return <>
    <div className="dashboard__content">
      <section className="dashboard-intro"><div><p className="section-kicker">{copy.eyebrow}</p><h1>{copy.title}<span>.</span></h1><p>{copy.subtitle}</p></div><EventCountdown name={copy.nextEventName} date={copy.date} /></section>
      <p className="demo-notice"><b>DEMO</b>{copy.demo}</p>
      <TeamBattle teams={demoTeams} />
      <DevelopmentRanking teams={demoTeams} />
      <section className="dashboard-section"><SectionHeading title="Technical Updates" eyebrow="ÚLTIMAS ACTUALIZACIONES" /><div className="updates-grid">{demoUpdates.map((update) => <UpdateCard key={`${update.team}-${update.component}`} update={update} />)}</div></section>
      <section className="dashboard-section"><SectionHeading title="F1 TECH Score" eyebrow="LECTURA COMPARATIVA · DEMO" /><div className="score-grid">{demoScores.map((score) => <ScoreCard key={score.label} {...score} />)}</div></section>
      <InsightPanels />
      <PredictionPanel />
      <ThreePreview />
    </div>
  </>
}
