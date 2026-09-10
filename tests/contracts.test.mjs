import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('canonical contracts retain stable component ids and separate publication states', async () => {
  const source = await readFile(new URL('../src/domain/grand-prix.ts', import.meta.url), 'utf8')
  for (const id of ['front-wing', 'floor', 'rear-wing', 'wheels-tyres']) assert.match(source, new RegExp(`'${id}'`))
  assert.match(source, /technicalState: TechnicalState/)
  assert.match(source, /validationState: PublicationState/)
})

test('SPA route helpers recognise every public route', async () => {
  const source = await readFile(new URL('../src/app/routes.ts', import.meta.url), 'utf8')
  for (const path of ['/inicio', '/garage', '/technical-preview', '/equipos', '/actualizaciones', '/circuitos']) assert.match(source, new RegExp(`'${path.replaceAll('/', '\\/')}'`))
})
