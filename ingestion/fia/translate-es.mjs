import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import glossary from './technical-glossary-es.json' with { type: 'json' }
import { automaticSpanishPolicy as policy, translationFields, checkTranslatedField, automaticTranslationErrors } from '../../src/services/fia/translation-policy.mjs'
import { localizeFiaUpdate, fiaLocalizationSourceKey } from '../../src/services/fia/localization.mjs'
export function protectTechnicalTerms(source) {
  const terms=Object.keys(glossary.terms).sort((a,b)=>b.length-a.length)
  const pattern=new RegExp('\\b('+terms.join('|')+')\\b','gi')
  const replacements=[]
  const text=source.replace(pattern,term=>{const index=replacements.length;replacements.push(glossary.terms[term.toLowerCase()]);return '[T'+index+']'})
  return {text,restore(translated){
    let result=translated
    replacements.forEach((term,index)=>{
      const re=new RegExp('\\[T'+index+'\\]','g')
      const matches=[...result.matchAll(re)]
      if(matches.length!==1)throw new Error('TRANSLATION_GLOSSARY_TOKEN_CHANGED:'+index)
      result=result.replace(re,term)
    })
    if(/\[T\d+\]/i.test(result))throw new Error('TRANSLATION_GLOSSARY_TOKEN_REMAINS')
    return result.replace(/\s+/g,' ').trim()
  }}
}
const cacheKey = (field,source) => createHash('sha256').update(JSON.stringify([policy,glossary,field,source])).digest('hex')
export async function addAutomaticSpanish(records,{engineFactory,cacheDirectory=resolve('ingestion/output/translation-cache'),useCache=true}={}) {
  let engine;const memo=new Map();const result=[]
  const translate=async(field,source)=>{
    const key=cacheKey(field,source)
    if(memo.has(key))return memo.get(key)
    if(useCache)try{const cached=JSON.parse(await readFile(resolve(cacheDirectory,key+'.json'),'utf8'));if(cached.source===source&&cached.key===key&&cached.targetHash===createHash('sha256').update(key+cached.target).digest('hex')&&!checkTranslatedField(source,cached.target).length){memo.set(key,cached.target);return cached.target}}catch{ /* Cache misses never approve a translation. */ }
    engine??=await (engineFactory??(async()=>{const {createTranslationEngine}=await import('./translation-runtime/engine.mjs');return createTranslationEngine()}))()
    const protectedSource=protectTechnicalTerms(source)
    const target=protectedSource.restore(await engine.translate(protectedSource.text))
    const errors=checkTranslatedField(source,target)
    if(errors.length)throw new Error('TRANSLATION_VALIDATION_FAILED:'+errors.join(','))
    memo.set(key,target)
    if(useCache){await mkdir(cacheDirectory,{recursive:true});await writeFile(resolve(cacheDirectory,key+'.json'),JSON.stringify({key,source,target,targetHash:createHash('sha256').update(key+target).digest('hex')})+'\n')}
    return target
  }
  try {
    for(const record of records) {
      const es=localizeFiaUpdate(record,'es')
      if(es.complete){result.push(record);continue}
      const entry={sourceKey:fiaLocalizationSourceKey(record),method:'automatic',reviewStatus:'unreviewed',policyVersion:policy.version,provider:Object.fromEntries(Object.entries(policy).filter(([key])=>key!=='version')),fieldMethods:{}}
      for(const field of translationFields) {
        const missing=es.missingFields.includes(field)
        entry[field]=missing?await translate(field,record[field]):es[field]
        entry.fieldMethods[field]=missing?'machine':'reviewed_phrase'
      }
      const enriched={...record,translations:{...record.translations,es:entry}}
      const errors=automaticTranslationErrors(enriched,fiaLocalizationSourceKey(record))
      if(errors.length)throw new Error('TRANSLATION_PROVENANCE_FAILED:'+errors.join(','))
      result.push(enriched)
    }
    return result
  } finally {await engine?.dispose?.()}
}
