const messages = {
  es: ['SIN ACTUALIZACIONES', 'ACTUALIZACIÓN', 'ACTUALIZACIONES'],
  en: ['NO UPDATES', 'UPDATE', 'UPDATES'],
  it: ['NESSUN AGGIORNAMENTO', 'AGGIORNAMENTO', 'AGGIORNAMENTI'],
  pt: ['SEM ATUALIZAÇÕES', 'ATUALIZAÇÃO', 'ATUALIZAÇÕES'],
  fr: ['AUCUNE MISE À JOUR', 'MISE À JOUR', 'MISES À JOUR'],
  de: ['KEINE UPDATES', 'UPDATE', 'UPDATES'],
}
export function garageUpdateCount(locale, count) { const [empty, singular, plural] = messages[locale] ?? messages.es; return count === 0 ? empty : `${count} ${count === 1 ? singular : plural}` }
