import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import picomatch from 'picomatch'
import { createViteRuntimeOptions } from '../scripts/vite-runtime.mjs'

const main = createViteRuntimeOptions('main')
const lab = createViteRuntimeOptions('lab')

function ignores(config, filename) {
  // Chokidar normalizes Windows paths before evaluating its glob matcher.
  return picomatch(config.server.watch.ignored)(filename.replaceAll('\\', '/'))
}

test('main and laboratory keep independent dependency caches under ignored node_modules', () => {
  assert.notEqual(main.cacheDir, lab.cacheDir)
  for (const config of [main, lab]) {
    assert.equal(path.isAbsolute(config.cacheDir), true)
    const insideProject = path.relative(config.root, config.cacheDir).split(path.sep)
    assert.equal(insideProject[0], 'node_modules')
    assert.equal(insideProject.includes('..'), false)
    assert.equal(path.relative(path.join(config.root, 'src'), config.cacheDir).startsWith('..'), true)
    assert.equal(path.resolve(config.optimizeDeps.entries[0]), path.join(path.resolve(config.root), 'index.html'))
    assert.equal(config.optimizeDeps.entries.length, 1)
    assert.equal(config.optimizeDeps.include.includes('@react-three/drei'), false)
  }
})

test('both runtimes ignore locked generated files on Windows and POSIX while retaining source HMR', () => {
  const windowsRoot = String.raw`C:\Users\mb937\Desktop\f1-tech`
  const posixRoot = '/home/developer/f1-tech'
  for (const config of [main, lab]) {
    for (const relative of [
      'work/skin-lab/vite-cache/deps/asw-locked',
      'work/skin-lab/assets/antonelli-body.png',
      'outputs/screenshots/asw-locked',
      'dist/assets/asw-locked',
      '.pnpm-store/v3/asw-locked',
    ]) {
      assert.equal(ignores(config, `${windowsRoot}\\${relative.replaceAll('/', '\\')}`), true, relative)
      assert.equal(ignores(config, `${posixRoot}/${relative}`), true, relative)
    }
    for (const relative of ['src/three/ModelViewer.tsx', 'src/three/asw-source.ts', 'src/pages/DriversPage.tsx', 'src/styles/garage.css', 'index.html']) {
      assert.equal(ignores(config, `${windowsRoot}\\${relative.replaceAll('/', '\\')}`), false, relative)
      assert.equal(ignores(config, `${posixRoot}/${relative}`), false, relative)
    }
  }
})

test('exact Drei alias preserves the seven installed viewer APIs and leaves deep imports resolvable', async () => {
  const wrapperPath = fileURLToPath(new URL('../src/three/viewer-drei.ts', import.meta.url))
  const wrapper = await import('../src/three/viewer-drei.ts')
  const bindings = {
    Billboard: 'core/Billboard.js',
    Environment: 'core/Environment.js',
    Html: 'web/Html.js',
    Lightformer: 'core/Lightformer.js',
    Line: 'core/Line.js',
    OrbitControls: 'core/OrbitControls.js',
    useGLTF: 'core/Gltf.js',
  }
  assert.deepEqual(Object.keys(wrapper).sort(), Object.keys(bindings).sort())
  for (const config of [main, lab]) {
    const alias = config.resolve.alias.find(item => item.find.test('@react-three/drei'))
    assert.ok(alias)
    assert.equal(path.resolve(alias.replacement), wrapperPath)
    assert.equal(alias.find.test('@react-three/drei/core/Gltf.js'), false)
    assert.equal(alias.find.test('@react-three/drei-helpers'), false)
  }
  for (const [name, subpath] of Object.entries(bindings)) {
    const originalModule = await import(`@react-three/drei/${subpath}`)
    assert.equal(wrapper[name], originalModule[name], name)
    assert.ok(wrapper[name])
  }
  assert.equal(typeof wrapper.useGLTF.preload, 'function')
  assert.equal(typeof wrapper.useGLTF.clear, 'function')
})

test('unsupported cache labels reject instead of silently sharing a runtime cache', () => {
  assert.throws(() => createViteRuntimeOptions('shared'), /Unknown F1 TECH Vite cache/)
  assert.throws(() => createViteRuntimeOptions('../src'), /Unknown F1 TECH Vite cache/)
})
