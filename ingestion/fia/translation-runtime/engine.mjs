import { pipeline, env } from '@huggingface/transformers'
import { resolve } from 'node:path'
import { mkdir,realpath } from 'node:fs/promises'
import policy from '../../../src/data/fia-localization/automatic-policy.json' with { type: 'json' }
export async function createTranslationEngine() {
  const cacheDirectory=resolve('ingestion/output/translation-models',policy.revision)
  await mkdir(cacheDirectory,{recursive:true})
  env.cacheDir=await realpath(cacheDirectory)
  env.backends.onnx.logLevel='error'
  const translator=await pipeline('translation',policy.model,{revision:policy.revision,dtype:policy.dtype,device:'cpu',session_options:{intraOpNumThreads:2,interOpNumThreads:1}})
  return {
    async translate(source) {
      const chunks=[...new Intl.Segmenter('en',{granularity:'sentence'}).segment(source)].map(x=>x.segment.trim()).filter(Boolean)
      const results=[]
      for(const chunk of chunks) {
        const tokens=await translator.tokenizer(chunk)
        if(tokens.input_ids.data.length>384)throw new Error('TRANSLATION_SOURCE_TOO_LONG: refusing silent truncation')
        const result=await translator(chunk,{num_beams:4,do_sample:false,max_new_tokens:384})
        results.push(result[0].translation_text)
      }
      return results.join(' ')
    },
    dispose:()=>translator.dispose(),
  }
}

