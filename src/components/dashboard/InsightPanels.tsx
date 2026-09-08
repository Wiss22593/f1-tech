import { SectionHeading } from './SectionHeading'

export function InsightPanels() {
  return <section className="insight-grid">
    <article className="card circuit-fit"><SectionHeading title="Circuit Fit" eyebrow="LECTURA DEL TRAZADO · DEMO" /><div className="fit-meter"><span style={{ width: '78%' }} /><i /></div><div className="fit-labels"><span>EFICIENCIA AERO</span><b>78 / 100</b></div><p>Referencia visual demostrativa para conectar más adelante características del circuito y rendimiento técnico.</p></article>
    <article className="card changed"><SectionHeading title="What Changed?" eyebrow="RESUMEN TÉCNICO · DEMO" /><ul><li><span>01</span>Nuevo foco en carga de baja altura.</li><li><span>02</span>Iteraciones de balance delantero.</li><li><span>03</span>Evaluación térmica en curso.</li></ul></article>
  </section>
}
