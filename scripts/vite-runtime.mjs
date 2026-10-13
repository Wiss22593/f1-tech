import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = fileURLToPath(new URL('../', import.meta.url))

/** Keep generated files outside the watched source tree and use separate caches. */
export function createViteRuntimeOptions(cacheLabel = 'main') {
  if (!['main', 'lab'].includes(cacheLabel)) throw new Error('Unknown F1 TECH Vite cache')
  return {
    root: projectRoot,
    cacheDir: path.join(projectRoot, 'node_modules', `.vite-f1-${cacheLabel}`),
    resolve: {
      alias: [{ find: /^@react-three\/drei$/, replacement: path.join(projectRoot, 'src/three/viewer-drei.ts') }],
    },
    optimizeDeps: {
      entries: [path.join(projectRoot, 'index.html')],
      include: ['react', 'react-dom/client', 'three', '@react-three/fiber'],
    },
    server: {
      watch: {
        ignored: ['**/work/**', '**/outputs/**', '**/dist/**', '**/.pnpm-store/**'],
      },
    },
  }
}
