// Optional real-browser regression. Start `npm run dev` and `npm run preview`.
// Supply PLAYWRIGHT_PATH when Playwright is provided by a workspace runtime.
import { createRequire } from 'node:module'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright')
const dev = process.env.LIVERY_DEV_URL || 'http://127.0.0.1:5173'
const preview = process.env.LIVERY_PREVIEW_URL || 'http://127.0.0.1:4173'
const output = process.env.LIVERY_OUTPUT || 'work/livery-browser'
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true, channel: process.env.LIVERY_BROWSER || 'msedge' })
const results = []
try {
  const harness = await browser.newPage()
  await harness.route('**/__livery-regression.html', route => readFile(new URL('../tests/fixtures/alpine-livery-decode.html', import.meta.url), 'utf8').then(body => route.fulfill({ contentType: 'text/html', body })))
  await harness.goto(`${dev}/__livery-regression.html`)
  await harness.waitForFunction(() => window.result, { timeout: 90000 })
  const decoded = await harness.evaluate(() => window.result)
  assert.equal(decoded.error, undefined)
  assert.match(decoded.baselineValidation, /Authored livery texture missing/)
  const names = ['MAIN_STICKERS_ALPINE', 'MAIN_BODY_ALPINE_FINAL', 'SKINNED_MAIN_ALPINE']
  assert.deepEqual(decoded.baseline.filter(m => names.includes(m.name)).map(m => m.map), [false, false, false])
  for (const name of names) {
    const material = decoded.protected.find(m => m.name === name)
    assert.equal(material.map, true); assert.equal(material.width, 4096); assert.equal(material.height, 1365)
    assert.equal(material.channel, name === names[0] ? 0 : 1)
  }
  results.push({ controlledDecodeFailure: decoded })
  await harness.close()
  for (const [name, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
    const page = await browser.newPage({ viewport, serviceWorkers: 'block' })
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(`${preview}/inicio?team=alpine`)
    await page.waitForSelector('#grand-prix-selector')
    await page.waitForTimeout(6500)
    await page.screenshot({ path: `${output}/${name}-initial.png` })
    for (const gp of ['dutch-2026', 'bahrain-2026', 'australia-2026', 'bahrain-2026']) {
      await page.selectOption('#grand-prix-selector', gp)
      await page.waitForTimeout(750)
      assert.equal(await page.locator('#grand-prix-selector').inputValue(), gp)
    }
    if (name === 'desktop') {
      await page.getByRole('button', { name: 'Refrigeración' }).first().click()
      await page.waitForTimeout(1200)
      await page.screenshot({ path: `${output}/${name}-cooling.png` })
      await page.locator('.showroom__views button').first().click()
      await page.waitForTimeout(1100)
      await page.locator('.showroom__views button').nth(1).click()
      await page.waitForTimeout(1100)
      await page.locator('.showroom__views button').first().click()
      await page.locator('button[data-team="ferrari"]').click()
      await page.waitForTimeout(4500)
      await page.screenshot({ path: `${output}/bgrt-ferrari.png` })
      await page.locator('button[data-team="alpine"]').click()
    } else {
      await page.locator('.showroom-mobile-chip').first().click()
      await page.waitForTimeout(1200)
      await page.locator('.showroom-mobile-reset').click()
    }
    await page.waitForTimeout(1500)
    await page.screenshot({ path: `${output}/${name}-reset.png` })
    await page.locator('.language-select select, header select').first().selectOption('en')
    await page.waitForTimeout(1000)
    await page.locator('.language-select select, header select').first().selectOption('es')
    await page.reload()
    await page.waitForSelector('#grand-prix-selector')
    await page.waitForTimeout(6500)
    await page.screenshot({ path: `${output}/${name}-reload.png` })
    assert.equal(await page.locator('.viewer-fallback').count(), 0)
    assert.deepEqual(errors, [])
    results.push({ viewport: name, gpCycles: 4, focusReset: true, reload: true, errors })
    await page.close()
  }
  await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2))
  console.log('PASS: atlas decode failure recovery; desktop/mobile GP, focus, camera, team, language, reset and reload')
} finally { await browser.close() }
