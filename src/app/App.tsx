import { useState } from 'react'
import { type AppSection } from './navigation'
import { DashboardHeader } from '../components/dashboard/DashboardHeader'
import { SectionPlaceholder } from '../components/dashboard/SectionPlaceholder'
import { type Locale } from '../i18n'
import { TechnicalPreview } from '../features/technical-preview/TechnicalPreview'
import { TeamsPage } from '../features/teams/TeamsPage'
import { UpdatesPage } from '../features/updates/UpdatesPage'
import { GaragePage } from '../features/garage/GaragePage'
import { CircuitsPage } from '../features/circuits/CircuitsPage'


export default function App() {
  const [section, setSection] = useState<AppSection>('preview')
  const [locale, setLocale] = useState<Locale>('es')
  return <main className="dashboard"><DashboardHeader activeSection={section} locale={locale} onLocaleChange={setLocale} onNavigate={setSection} />
    {section === 'preview' ? <TechnicalPreview locale={locale} /> : section === 'teams' ? <TeamsPage /> : section === 'updates' ? <UpdatesPage /> : section === 'garage' ? <GaragePage /> : <CircuitsPage />}
    <footer className="dashboard-footer">F1 TECH © {new Date().getFullYear()} <span>·</span> DATOS DEMO · SIN INFORMACIÓN OFICIAL<br /><span className="legal-disclaimer">F1 TECH es un proyecto independiente y no está afiliado, patrocinado ni respaldado por Formula 1, FIA ni los equipos de Formula 1.</span></footer>
  </main>
}
