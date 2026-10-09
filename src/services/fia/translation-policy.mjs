import policy from '../../data/fia-localization/automatic-policy.json' with { type: 'json' }
export { policy as automaticSpanishPolicy }
export const translationFields = ['componentName','primaryReason','geometricDifference','briefDescription']
const numberWords = {two:'2',three:'3',four:'4',five:'5',six:'6',seven:'7',eight:'8',nine:'9',ten:'10',dos:'2',tres:'3',cuatro:'4',cinco:'5',seis:'6',siete:'7',ocho:'8',nueve:'9',diez:'10'}
const quantities = text => (text.match(/\b\d+(?:[.,]\d+)?\b|\b(?:two|three|four|five|six|seven|eight|nine|ten|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\b/gi) ?? []).map(x=>numberWords[x.toLowerCase()]??x.replace(',','.')).sort()
export function checkTranslatedField(source, target) {
  const errors=[]
  if (!source) return target == null || target === '' ? [] : ['unexpected_translation']
  if (typeof target !== 'string' || !target.trim()) return ['empty_translation']
  if (target.length > source.length * 4 + 80 || target.length < source.length * .25) errors.push('translation_length')
  if (/<[^>]+>|__?TERM|\[T\d+\]|Traducción al español pendiente|https?:\/\//i.test(target)) errors.push('translation_artifact')
  if (JSON.stringify(quantities(source)) !== JSON.stringify(quantities(target))) errors.push('translation_quantities_changed')
  for (const token of source.match(/\b[A-Z][A-Z0-9]{1,}\b/g) ?? []) if (!new RegExp('\\b'+token+'\\b').test(target)) errors.push('translation_acronym_lost:'+token)
  if (/\b(?:not|no|without|unchanged|unmodified)\b/i.test(source) && !/\b(?:no|sin|inalterad[oa]s?|sin cambios|mantiene[n]?)\b/i.test(target)) errors.push('translation_negation_lost')
  const cues = [[/\brevised\b/i,/revisad/i],[/\bnew\b/i,/nuev/i],[/\b(?:larger|enlarged|increased)\b/i,/mayor|más grande|ampliad|aument|increment|elevad/i],[/\b(?:reduced|smaller)\b/i,/reduc|menor|más pequeñ/i],[/\bimproved\b/i,/mejor/i],[/\bmaintain\w*\b/i,/manten|mantien|conserv/i],[/\bstability\b/i,/estabilidad/i],[/\bcooling\b/i,/refriger|enfri/i],[/\bgeometr\w*\b/i,/geometr/i]]
  for(const [english,spanish] of cues)if(english.test(source)&&!spanish.test(target))errors.push('translation_technical_cue_lost:'+english.source)
  return errors
}
export function automaticTranslationErrors(record, sourceKey) {
  const t=record.translations?.es, errors=[]
  if (!t || t.method !== 'automatic' || t.reviewStatus !== 'unreviewed' || t.sourceKey !== sourceKey || t.policyVersion !== policy.version) return ['invalid_automatic_translation_provenance']
  if (Object.keys(policy).some(key => key !== 'version' && t.provider?.[key] !== policy[key])) errors.push('invalid_automatic_translation_provider')
  for(const field of translationFields) {
    if (!['reviewed_phrase','machine'].includes(t.fieldMethods?.[field])) errors.push('invalid_translation_field_method:'+field)
    errors.push(...checkTranslatedField(record[field],t[field]).map(e=>field+':'+e))
  }
  if (!Object.values(t.fieldMethods??{}).includes('machine')) errors.push('automatic_without_machine_fields')
  return errors
}
