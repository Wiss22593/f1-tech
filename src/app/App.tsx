import { Component, lazy, Suspense, useEffect, useState, type ReactNode } from 'react'
import { type AppSection } from './navigation'
import { navigateToSection, sectionFromLocation } from './routes'
import { DashboardHeader } from '../components/dashboard/DashboardHeader'
import { runtimeText, t, type Locale } from '../i18n'
const TechnicalPreview = lazy(() => import('../features/technical-preview/TechnicalPreview').then((module) => ({ default: module.TechnicalPreview })))
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
  function navigate(sectionId: AppSection) { navigateToSection(sectionId); setSection(sectionId) }
  return <main className="dashboard"><DashboardHeader activeSection={section} locale={locale} onLocaleChange={setLocale} onNavigate={navigate} />
    <RouteErrorBoundary locale={locale}><Suspense fallback={<section className="placeholder-page"><p>{runtimeText(locale, 'loading')}</p></section>}>
      {section === 'preview' ? <TechnicalPreview locale={locale} /> : section === 'teams' ? <TeamsPage locale={locale} /> : section === 'updates' ? <UpdatesPage locale={locale} /> : section === 'garage' ? <GaragePage locale={locale} /> : <CircuitsPage locale={locale} />}
    </Suspense></RouteErrorBoundary>
    <footer className="dashboard-footer">F1 TECH © {new Date().getFullYear()} <span>·</span> {t(locale).common.demo}<br /><span className="legal-disclaimer">{t(locale).common.legal}</span></footer>
  </main>
}
