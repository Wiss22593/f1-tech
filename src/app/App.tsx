import { insightText } from '../features/insights/copy'
import { Component, lazy, Suspense, useEffect, useState, type ReactNode } from 'react'
import { PublicPage } from '../features/public/PublicPage'
import { InformationLinks } from '../components/public/InformationMenu'
import { publicText } from '../i18n/public-pages'
import { pathForSection } from './routes'
import { type AppSection } from './navigation'
import { navigateToSection, sectionFromLocation } from './routes'
import { DashboardHeader } from '../components/dashboard/DashboardHeader'
import { runtimeText, t, type Locale } from '../i18n'
const TechnicalPreview = lazy(() => import('../features/technical-preview/TechnicalPreview').then((module) => ({ default: module.TechnicalPreview })))
const DriversPage = lazy(() => import('../features/drivers/DriversPage').then((module) => ({ default: module.DriversPage })))
const TeamsPage = lazy(() => import('../features/teams/TeamsPage').then((module) => ({ default: module.TeamsPage })))
const UpdatesPage = lazy(() => import('../features/updates/UpdatesPage').then((module) => ({ default: module.UpdatesPage })))
const GaragePage = lazy(() => import('../features/garage/GaragePage').then((module) => ({ default: module.GaragePage })))
const CircuitsPage = lazy(() => import('../features/circuits/CircuitsPage').then((module) => ({ default: module.CircuitsPage })))

class RouteErrorBoundary extends Component<{ children: ReactNode; locale: Locale }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? <section className="placeholder-page"><p>{runtimeText(this.props.locale, 'routeError')}</p></section> : this.props.children }
}


export default function App() {
  const [section, setSection] = useState<AppSection>(() => sectionFromLocation())
  const [locale, setLocale] = useState<Locale>(() => (localStorage.getItem('f1-tech-locale') as Locale) || 'es')
  useEffect(() => { localStorage.setItem('f1-tech-locale', locale); document.documentElement.lang = locale }, [locale])
  useEffect(() => { const syncSection = () => setSection(sectionFromLocation()); window.addEventListener('popstate', syncSection); return () => window.removeEventListener('popstate', syncSection) }, [])
  useEffect(() => {
const titles = { drivers: insightText(locale, 'drivers'), garage: 'Formula Tech', preview: 'Technical Preview', teams: publicText(locale).teams, updates: publicText(locale).updates, circuits: publicText(locale).circuits, about: publicText(locale).about, privacy: publicText(locale).privacy, contact: publicText(locale).contact }
document.title = section === 'garage' ? titles.garage : titles[section] + ' · Formula Tech'
document.querySelector('link[rel="canonical"]')?.setAttribute('href', 'https://formulatech.netlify.app' + pathForSection(section))
}, [section, locale])
  function navigate(sectionId: AppSection) { navigateToSection(sectionId); setSection(sectionId) }
  return <main className="dashboard"><DashboardHeader activeSection={section} locale={locale} onLocaleChange={setLocale} onNavigate={navigate} />
    <RouteErrorBoundary locale={locale}><Suspense fallback={<section className="placeholder-page"><p>{runtimeText(locale, 'loading')}</p></section>}>
      {section === 'about' || section === 'privacy' || section === 'contact' ? <PublicPage section={section} locale={locale} /> : section === 'preview' ? <TechnicalPreview locale={locale} /> : section === 'drivers' ? <DriversPage locale={locale} /> : section === 'teams' ? <TeamsPage locale={locale} /> : section === 'updates' ? <UpdatesPage locale={locale} /> : section === 'garage' ? <GaragePage locale={locale} /> : <CircuitsPage locale={locale} />}
    </Suspense></RouteErrorBoundary>
    <footer className="dashboard-footer">Formula Tech © {new Date().getFullYear()}<br /><span className="legal-disclaimer">{t(locale).common.legal}</span><nav className="public-links" aria-label={publicText(locale).information}><InformationLinks locale={locale} /></nav></footer>
  </main>
}

