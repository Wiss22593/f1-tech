import { execFile } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'

const execFileAsync = promisify(execFile)
const allowedPrefixes = ['public/data/grands-prix/', 'data/grands-prix/']

export function buildDataChangePlan(paths, now = new Date()) {
  const files = [...new Set(paths.map((path) => path.replace(/\\/g, '/')).filter((path) => allowedPrefixes.some((prefix) => path.startsWith(prefix))))].sort()
  return { version: 1, branch: `automation/fia-data-${now.toISOString().slice(0, 10)}`, title: 'data: publish validated FIA updates', commitMessage: 'data: publish validated FIA updates', files, safeToPropose: files.length > 0 }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const { stdout } = await execFileAsync('git', ['status', '--porcelain=v1', '--untracked-files=all'])
  const paths = stdout.split(/\r?\n/).filter(Boolean).map((line) => line.slice(3).trim())
  const plan = buildDataChangePlan(paths)
  const outputPath = resolve('ingestion/output/reports/data-pr-plan.json')
  await mkdir(resolve('ingestion/output/reports'), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(plan, null, 2)}\n`)
  console.log(JSON.stringify({ outputPath, ...plan }, null, 2))
}
