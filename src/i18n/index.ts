export type Locale = 'es' | 'en' | 'it' | 'pt' | 'fr' | 'de'

const messages = {
  es: {
    preview: {
      eyebrow: 'ANÁLISIS PREVIO · ENTORNO DEMO',
      title: 'Technical Preview',
      subtitle: 'La lectura técnica antes de que se apague el semáforo.',
      demo: 'Todos los datos que se muestran son demostrativos; no representan información real de equipos, circuitos o actualizaciones.',
      nextEvent: 'PRÓXIMO GRAN PREMIO',
      nextEventName: 'CIRCUITO DEMO',
      date: 'FECHA POR DEFINIR',
    },
    common: { demo: 'DEMO', independent: 'Métrica propia de F1 TECH', legal: 'F1 TECH es un proyecto independiente y no está afiliado, patrocinado ni respaldado por Formula 1, FIA ni los equipos de Formula 1.' },
  },
} as const

export function t(locale: Locale) {
  // Español es el idioma actual. Los otros códigos conservan el fallback mientras se amplían catálogos.
  return messages[locale as keyof typeof messages] ?? messages.es
}
