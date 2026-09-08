type EventCountdownProps = { name: string; date: string }

export function EventCountdown({ name, date }: EventCountdownProps) {
  const units = [{ value: '04', label: 'DÍAS' }, { value: '18', label: 'HRS' }, { value: '36', label: 'MIN' }, { value: '52', label: 'SEG' }]
  return <section className="event-countdown card" aria-label="Próximo Gran Premio, datos demo">
    <div><p className="section-kicker">PRÓXIMO GRAN PREMIO</p><h2>{name}</h2><p className="muted">{date}</p></div>
    <div className="countdown" aria-label="Cuenta regresiva demostrativa">{units.map((unit) => <div key={unit.label}><strong>{unit.value}</strong><span>{unit.label}</span></div>)}</div>
  </section>
}
