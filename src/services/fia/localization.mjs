import { automaticTranslationErrors } from './translation-policy.mjs'
import catalogue from '../../data/fia-localization/es.json' with { type: 'json' }
import terms from '../../data/fia-localization/terms-es.json' with { type: 'json' }

const fields = ['componentName', 'primaryReason', 'geometricDifference', 'briefDescription']
const pending = 'Traducción al español pendiente.'

/** Binds reviewed copy to the original text and document, never just a row ID. */
export function fiaLocalizationSourceKey(record) {
  return JSON.stringify([
    record.contentHash ?? null,
    record.componentName ?? null,
    record.primaryReason ?? record.category ?? null,
    record.geometricDifference ?? null,
    record.briefDescription ?? record.description ?? record.sourceText ?? null,
    record.sourceText ?? null,
  ])
}

// Reuse only complete, exactly matching reviewed phrases, separately by field.
// This is a translation memory, not a translator for new technical descriptions.
const phrases = Object.fromEntries(fields.map(field => [field, new Map(Object.entries(terms[field] ?? {}))]))
for (const entry of Object.values(catalogue)) {
  const source = JSON.parse(entry.sourceKey)
  fields.forEach((field, index) => {
    if (source[index + 1] && entry.es[field] && !phrases[field].has(source[index + 1])) phrases[field].set(source[index + 1], entry.es[field])
  })
}

/** Pure presentation boundary: raw published records and their metadata stay intact. */
export function localizeFiaUpdate(record, locale) {
  const original = {
    componentName: record.componentName ?? null,
    primaryReason: record.primaryReason ?? record.category ?? null,
    geometricDifference: record.geometricDifference ?? null,
    briefDescription: record.briefDescription ?? record.description ?? record.sourceText ?? null,
  }
  if (locale !== 'es') return {
    ...original,
    componentLabel: original.componentName ?? record.componentId ?? '—',
    summary: record.objective ?? record.sourceText,
    complete: true,
    missingFields: [],
  }

  const embedded=record.translations?.es
  const automatic=Boolean(embedded && (embedded.method==='automatic' || embedded.provider || embedded.policyVersion))
  const automaticErrors=automatic?automaticTranslationErrors(record,fiaLocalizationSourceKey(record)):[]
  const reviewed = embedded?.sourceKey === fiaLocalizationSourceKey(record) && !automaticErrors.length ? {sourceKey:embedded.sourceKey,es:Object.fromEntries(fields.map(f=>[f,embedded[f]]))} : catalogue[record.id]
  const missingFields = []
  const localized = reviewed?.sourceKey === fiaLocalizationSourceKey(record) ? { ...reviewed.es } : Object.fromEntries(fields.map(field => {
    const source = field === 'componentName' ? original[field] ?? record.componentId : original[field]
    if (source == null || source === '') return [field, source ?? null]
    const translation = phrases[field].get(source)
    if (!translation) missingFields.push(field)
    return [field, translation ?? pending]
  }))
  if(automaticErrors.length)for(const field of fields){if(original[field]){localized[field]=pending;if(!missingFields.includes(field))missingFields.push(field)}}
  for (const field of fields) {
    if (original[field] && (!localized[field] || localized[field] === pending)) {
      if (!missingFields.includes(field)) missingFields.push(field)
      localized[field] = pending
    }
  }
  return {
    ...localized,
    translationStatus: missingFields.length ? 'pending' : automatic ? 'automatic' : 'reviewed',
    ...(automatic && !automaticErrors.length ? {translationStatus:'automatic',translationNotice:'Traducción automática al español · Sin revisión humana. Original FIA en inglés disponible.'} : {}),
    componentLabel: localized.componentName ?? '—',
    summary: fields.map(field => localized[field]).filter(Boolean).join(' | '),
    complete: missingFields.length === 0,
    missingFields,
  }
}
