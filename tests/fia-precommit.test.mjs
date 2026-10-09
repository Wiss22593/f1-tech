import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { execFileSync, spawnSync } from 'node:child_process'
const script = resolve('ingestion/fia/precommit.mjs')
const fixture = await readFile('public/data/grands-prix/2026/azerbaijan-2026.json','utf8')
const path = 'public/data/grands-prix/2026/azerbaijan-2026.json'
async function repository() {
  const cwd = await mkdtemp(join(tmpdir(),'f1-precommit-'))
  const git = (...args) => execFileSync('git',args,{cwd,stdio:'pipe'})
  git('init','--initial-branch=main'); git('config','user.name','Test');git('config','user.email','test@example.invalid')
  await writeFile(join(cwd,'readme'),'base');git('add','readme');git('commit','-m','base')
  git('init','--bare',join(cwd,'remote.git'));git('remote','add','origin',join(cwd,'remote.git'));git('push','origin','main')
  await mkdir(join(cwd,'public/data/grands-prix/2026'),{recursive:true});await writeFile(join(cwd,path),fixture)
  const output = join(cwd,'output')
  const run = () => spawnSync(process.execPath,[script],{cwd,encoding:'utf8',env:{...process.env,DATASET_PATH:path,GITHUB_OUTPUT:output}})
  return {cwd,git,run,output}
}
test('precommit permits unchanged remote and stops duplicate publication',async()=>{
  const r=await repository();assert.equal(r.run().status,0);assert.match(await readFile(r.output,'utf8'),/commit=true/)
  r.git('add',path);r.git('commit','-m','publish');r.git('push','origin','main')
  await writeFile(r.output,'');assert.equal(r.run().status,0);assert.match(await readFile(r.output,'utf8'),/commit=false/)
})
test('precommit refuses concurrent changes to main without creating a commit',async()=>{
  const r=await repository();const before=r.git('rev-parse','HEAD').toString().trim()
  const tree=r.git('rev-parse','HEAD^{tree}').toString().trim()
  const commit=execFileSync('git',['commit-tree',tree,'-p',before,'-m','concurrent'],{cwd:r.cwd,encoding:'utf8'}).trim()
  r.git('push','origin',`${commit}:main`)
  const result=r.run();assert.notEqual(result.status,0);assert.match(result.stderr,/MAIN_CHANGED_RETRY_NEXT_CRON/)
  assert.equal(r.git('rev-parse','HEAD').toString().trim(),before)
})
