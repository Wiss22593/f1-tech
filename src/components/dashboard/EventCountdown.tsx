import { type Locale, uiText } from '../../i18n'
type EventCountdownProps = { name: string; date: string; locale: Locale }

export function EventCountdown({ name, date, locale }: EventCountdownProps) {
  const units = [{ value: '04', label: uiText(locale, 'days') }, { value: '18', label: uiText(locale, 'hours') }, { value: '36', label: uiText(locale, 'minutes') }, { value: '52', label: uiText(locale, 'seconds') }]
  return <section className="event-countdown card" aria-label={`${uiText(locale, 'nextGp')} · ${uiText(locale, 'demo')}`}>
    <div><p className="section-kicker">{uiText(locale, 'nextGp')}</p><h2>{name}</h2><p className="muted">{date}</p></div>
    <div className="countdown" aria-label={uiText(locale, 'countdown')}>{units.map((unit) => <div key={unit.label}><strong>{unit.value}</strong><span>{unit.label}</span></div>)}</div>
  </section>
}
