// Run against npm run preview or npm run dev. Requires Playwright externally;
// PLAYWRIGHT_MODULE and BROWSER_EXECUTABLE may select an existing local runtime.
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright')
const base = process.env.QA_URL ?? 'http://localhost:5173'
const output = process.env.QA_OUTPUT
if (output) await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_EXECUTABLE || undefined, args: process.env.QA_SOFTWARE_GL ? ['--use-angle=swiftshader'] : [] })
const results = []
try {
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport })
    await context.addInitScript(() => {
      window.__f1TestRoots = new Set()
      window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
        supportsFiber: true, inject: () => 1,
        onCommitFiberRoot: (_, root) => window.__f1TestRoots.add(root),
        onCommitFiberUnmount() {}, onPostCommitFiberRoot() {},
      }
      window.__f1ReadModel = () => {
        let model, state
        const walk = fiber => {
          if (!fiber) return
          const candidate = fiber.memoizedProps?.object ?? fiber.stateNode?.object
          if (candidate?.componentFocusDiagnostics) model = candidate
          const store = fiber.memoizedProps?.value
          if (store?.getState && store.getState()?.scene) state = store.getState()
          walk(fiber.child); walk(fiber.sibling)
        }
        for (const root of window.__f1TestRoots) walk(root.current)
        if (!model) return null
        const livery = new Map()
        let meshes = 0
        model.traverse(mesh => {
          if (!mesh.isMesh) return
          meshes++
          for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
            if (!['MAIN_BODY_ALPINE_FINAL', 'MAIN_STICKERS_ALPINE', 'SKINNED_MAIN_ALPINE'].includes(material.name)) continue
            const map = material.map
            livery.set(material.name, { name: material.name, map: !!map, texture: map?.uuid, channel: map?.channel, width: map?.image?.width, height: map?.image?.height, color: material.color.toArray(), roughness: material.roughness, metalness: material.metalness })
          }
        })
        return { ...model.componentFocusDiagnostics(), meshes, livery: [...livery.values()].sort((a,b) => a.name.localeCompare(b.name)), camera: state ? { position: state.camera.position.toArray(), fov: state.camera.fov } : null, frameCalls: state?.gl.info.render.calls }
      }
    })
    const page = await context.newPage(), errors = [], requests = []
    page.on('pageerror', error => errors.push(error.stack))
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
    page.on('response', response => { if (response.url().includes('.glb')) requests.push({ url: response.url(), status: response.status() }) })
    const read = () => page.evaluate(() => window.__f1ReadModel())
    const ready = async id => {
      await page.waitForFunction(id => { const s = window.__f1ReadModel(); return s?.assetId === id && s.active === null && s.materials.every(m => m.gain === 1 && m.haloContrast === 0) }, id, { timeout: 60000 })
      await page.waitForTimeout(1100)
      assert.deepEqual(await page.locator('.viewer-fallback').allTextContents(), [])
      const result = await read()
      console.log('ready', viewport.width, id)
      assert.ok(result.meshes > (id.startsWith('alpine') ? 400 : 0))
      assert.deepEqual(result.failures, [])
      return result
    }
    const alpine = 'alpine-a526-formulatech-evaluation'
    await page.goto(`${base}/?team=alpine`)
    const baseline = await ready(alpine)
    assert.equal(await page.locator('#grand-prix-selector').inputValue(), 'bahrain-2026')
    assert.equal(baseline.livery.length, 3)
    for (const m of baseline.livery) { assert.ok(m.map); assert.equal(m.width,4096); assert.equal(m.height,1365) }
    assert.equal(baseline.livery.find(m => m.name === 'MAIN_BODY_ALPINE_FINAL').channel, 1)
    assert.equal(baseline.targets.halo.length, 13)
    if (baseline.frameCalls !== undefined) assert.ok(baseline.frameCalls > 0)
    const normal = snapshot => {
      assert.equal(snapshot.active, null)
      assert.ok(snapshot.materials.every(m => m.gain === 1 && m.haloContrast === 0))
      assert.deepEqual(snapshot.livery, baseline.livery)
    }
    normal(baseline)
    if (output) await page.screenshot({ path: join(output, `alpine-${viewport.width}-loaded.png`) })
    if (viewport.width > 600) {
      for (const [label, active] of [['Halo','halo'], ['Refrigeración','cooling'], ['Suspensión trasera','rearSuspension'], ['Nariz',null]]) {
        await page.getByRole('button', { name: label, exact: false }).filter({ has: page.locator('span') }).first().click()
        await page.waitForTimeout(1100)
        await page.waitForFunction(active => { const s = window.__f1ReadModel(); return s?.active === active && s.materials.every(m => m.gain === (!active || m.components.includes(active) ? 1 : .28) && m.haloContrast === (active === 'halo' && m.components.includes(active) ? .12 : 0)) }, active, { timeout: 60000 })
        const snapshot = await read()
        assert.equal(snapshot.active, active, label)
        assert.deepEqual(snapshot.livery, baseline.livery)
        if (active === 'halo') assert.ok(snapshot.materials.filter(m => m.components.includes('halo')).every(m => m.haloContrast === .12))
        if (active === 'cooling') assert.equal(snapshot.mode, 'internal')
        assert.deepEqual(await page.locator('.viewer-fallback').allTextContents(), [])
      }
      await page.locator('.showroom__views').getByRole('button', { name: 'RESTABLECER', exact: true }).click()
      normal(await ready(alpine))
    }
    const gps = await page.locator('#grand-prix-selector option:not([disabled])').evaluateAll(options => options.map(o => o.value).filter(value => value && value !== 'bahrain-2026').slice(0,2))
    assert.equal(gps.length, 2)
    for (const gp of [...gps, 'bahrain-2026']) {
      await page.locator('#grand-prix-selector').selectOption(gp)
      normal(await ready(alpine))
    }
    const team = id => viewport.width > 600 ? page.locator(`.showroom-teambar--desktop [data-team="${id}"]`) : page.locator('.showroom-team-mobile').getByRole('button', { name: new RegExp(id, 'i') })
    await team('ferrari').click()
    await ready('bgrt-f1-concept-2026-evaluation')
    await team('alpine').click()
    normal(await ready(alpine))
    await page.reload(); const reloaded = await ready(alpine)
    assert.equal(reloaded.livery.length, 3)
    assert.ok(reloaded.livery.every(m => m.map && m.width === 4096))
    assert.ok(requests.some(r => r.url.endsWith('/models/alpine-a526-formulatech.glb') && r.status === 200))
    assert.ok(requests.every(r => !/apex/i.test(r.url)))
    assert.deepEqual(errors, [])
    if (output) await page.screenshot({ path: join(output, `alpine-${viewport.width}-reset.png`) })
    results.push({ viewport, gp: 'bahrain-2026', meshes: reloaded.meshes, haloTargets: reloaded.targets.halo.length, livery: reloaded.livery, requests, errors })
    await context.close()
  }
  if (output) await writeFile(join(output, 'alpine-browser-qa.json'), JSON.stringify(results,null,2))
  console.log(JSON.stringify(results,null,2))
} finally { await browser.close() }
