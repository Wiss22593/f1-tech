import { demoCircuit, demoScore } from '../../data/demo/technical'

const labels: Record<keyof typeof demoCircuit.demands, string> = { downforce: 'Carga aerodinámica', efficiency: 'Eficiencia en recta', braking: 'Frenada', traction: 'Tracción', tyreManagement: 'Gestión de neumáticos', cornering: 'Paso por curva', kerbs: 'Pianos', cooling: 'Refrigeración', technicalComplexity: 'Complejidad técnica' }

export function CircuitsPage() {
  return <section className="circuits-page dashboard__content" aria-labelledby="circuits-title"><header className="circuits-page__hero"><div><p className="section-kicker">INTELIGENCIA DE CIRCUITO · DEMO</p><h1 id="circuits-title">Circuitos<span>.</span></h1><p>La capa que traduce las exigencias del trazado en contexto técnico para cada actualización.</p></div><div className="circuit-score"><span>CIRCUIT FIT</span><strong>{demoScore}</strong><b>DEMO · MÉTRICA PROPIA</b></div></header>
    <p className="demo-notice"><b>DEMO</b>El trazado y todos sus valores son demostrativos. Circuit Fit es una métrica independiente de F1 TECH, no oficial ni asociada a Formula 1, FIA o equipos.</p>
    <section className="circuit-profile card"><div className="circuit-profile__heading"><p className="section-kicker">PERFIL DE REFERENCIA</p><h2>{demoCircuit.name}</h2><span>{demoCircuit.country} · {demoCircuit.confidence}</span></div><div className="circuit-demand-grid">{(Object.entries(demoCircuit.demands) as [keyof typeof demoCircuit.demands, number][]).map(([key, value]) => <article key={key}><div><span>{labels[key]}</span><b>{value}<em>/10</em></b></div><i><i style={{ width: `${value * 10}%` }} /></i></article>)}</div></section>
    <section className="circuit-method card"><p className="section-kicker">MÉTODO F1 TECH</p><h2>Cómo se prepara Circuit Fit</h2><div><article><span>01</span><p>Perfil de demandas del circuito.</p></article><article><span>02</span><p>Fortalezas y objetivo técnico de la actualización.</p></article><article><span>03</span><p>Ponderación transparente del F1 TECH Score.</p></article></div><b>ESTRUCTURA LISTA PARA FUENTES TRAZABLES</b></section>
  </section>
}
