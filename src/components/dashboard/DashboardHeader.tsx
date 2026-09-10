import { menuLabel, t, type Locale } from '../../i18n'
import { useState } from 'react'
import { navigationItems, type AppSection } from '../../app/navigation'
import { Wordmark } from '../brand/Wordmark'

type DashboardHeaderProps = { activeSection: AppSection; locale: Locale; onLocaleChange: (locale: Locale) => void; onNavigate: (section: AppSection) => void }

const localeNames: Record<Locale, string> = { es: 'ES', en: 'EN', it: 'IT', pt: 'PT', fr: 'FR', de: 'DE' }

export function DashboardHeader({ activeSection, locale, onLocaleChange, onNavigate }: DashboardHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <header className="dashboard-header">
      <Wordmark locale={locale} />
      <span className="dashboard-header__divider" />
      <button type="button" className="mobile-menu-toggle" aria-label={menuLabel(locale)} aria-expanded={menuOpen} aria-controls="main-navigation" onClick={() => setMenuOpen((open) => !open)}><i /><i /><i /></button>
      <nav id="main-navigation" className={menuOpen ? 'main-nav main-nav--open' : 'main-nav'} aria-label={t(locale).common.primaryNavigation}>
        {navigationItems(locale).map((item) => <button className={activeSection === item.id ? 'main-nav__link main-nav__link--active' : 'main-nav__link'} key={item.id} onClick={() => { onNavigate(item.id); setMenuOpen(false) }}>{item.label}</button>)}
      </nav>
      <div className="dashboard-header__tools">
        <span className="live-label"><i /> {t(locale).common.demoMode}</span>
        <label className="locale-picker"><span className="sr-only">{t(locale).common.language}</span>
          <select value={locale} onChange={(event) => onLocaleChange(event.target.value as Locale)}>
            {(Object.keys(localeNames) as Locale[]).map((code) => <option key={code} value={code}>{localeNames[code]}</option>)}
          </select>
        </label>
      </div>
    </header>
  )
}
