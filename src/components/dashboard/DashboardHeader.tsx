import type { Locale } from '../../i18n'
import { navigationItems, type AppSection } from '../../app/navigation'
import { Wordmark } from '../brand/Wordmark'

type DashboardHeaderProps = { activeSection: AppSection; locale: Locale; onLocaleChange: (locale: Locale) => void; onNavigate: (section: AppSection) => void }

const localeNames: Record<Locale, string> = { es: 'ES', en: 'EN', it: 'IT', pt: 'PT', fr: 'FR', de: 'DE' }

export function DashboardHeader({ activeSection, locale, onLocaleChange, onNavigate }: DashboardHeaderProps) {
  return (
    <header className="dashboard-header">
      <Wordmark />
      <span className="dashboard-header__divider" />
      <nav className="main-nav" aria-label="Navegación principal">
        {navigationItems.map((item) => <button className={activeSection === item.id ? 'main-nav__link main-nav__link--active' : 'main-nav__link'} key={item.id} onClick={() => onNavigate(item.id)}>{item.label}</button>)}
      </nav>
      <div className="dashboard-header__tools">
        <span className="live-label"><i /> DEMO MODE</span>
        <label className="locale-picker"><span className="sr-only">Idioma</span>
          <select value={locale} onChange={(event) => onLocaleChange(event.target.value as Locale)}>
            {(Object.keys(localeNames) as Locale[]).map((code) => <option key={code} value={code}>{localeNames[code]}</option>)}
          </select>
        </label>
      </div>
    </header>
  )
}
