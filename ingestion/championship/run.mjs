import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { JolpicaChampionshipProvider } from './jolpica.mjs'
import { resolveChampionshipSource } from './source-config.mjs'

const args = Object.fromEntries(process.argv.slice(2).filter((value) => value.startsWith('--')).map((value) => { const [key, ...rest] = value.slice(2).split('='); return [key, rest.join('=') || true] }))
const season = Number(args.season ?? 2026)
const source = resolveChampionshipSource()
if (source.source !== 'jolpica-development') throw new Error('SELECTED_COMMERCIAL_PROVIDER_ADAPTER_REQUIRES_APPROVAL')
const outputPath = resolve(args.output ?? `ingestion/output/championship-development/${season}.json`)
let fallback = null
try { fallback = JSON.parse(await readFile(outputPath, 'utf8')) } catch { /* first successful publication */ }
const snapshot = { ...(await new JolpicaChampionshipProvider({ fallback }).getSnapshot(season)), productionEligible: false }
const comparable = (value) => JSON.stringify({ drivers: value?.drivers, constructors: value?.constructors, round: value?.round })
if (!snapshot.stale && comparable(snapshot) !== comparable(fallback)) {
  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(`${outputPath}.next`, `${JSON.stringify(snapshot, null, 2)}\n`)
  await rename(`${outputPath}.next`, outputPath)
  console.log(JSON.stringify({ status: 'PUBLISHED', outputPath, season, drivers: snapshot.drivers.length, constructors: snapshot.constructors.length, round: snapshot.round }, null, 2))
} else console.log(JSON.stringify({ status: snapshot.stale ? 'STALE_FALLBACK' : 'UNCHANGED', outputPath, season, drivers: snapshot.drivers.length, constructors: snapshot.constructors.length, round: snapshot.round, fallbackReason: snapshot.fallbackReason ?? null }, null, 2))
