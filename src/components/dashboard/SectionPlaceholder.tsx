type SectionPlaceholderProps = { eyebrow: string; title: string; description: string; items: string[] }

export function SectionPlaceholder({ eyebrow, title, description, items }: SectionPlaceholderProps) {
  return <section className="placeholder-page dashboard__content" aria-labelledby="placeholder-title">
    <div className="placeholder-page__copy"><p className="section-kicker">{eyebrow}</p><h1 id="placeholder-title">{title}<span>.</span></h1><p>{description}</p></div>
    <div className="placeholder-page__visual" aria-hidden="true"><i /><span /><b /></div>
    <section className="placeholder-page__scope card"><p className="section-kicker">EN PREPARACIÓN</p><h2>Lo que vas a encontrar</h2><ul>{items.map((item, index) => <li key={item}><span>{String(index + 1).padStart(2, '0')}</span>{item}</li>)}</ul></section>
    <p className="demo-notice"><b>DEMO</b>Esta sección es una vista conceptual. Aún no contiene datos de la temporada, equipos o circuitos reales.</p>
  </section>
}
