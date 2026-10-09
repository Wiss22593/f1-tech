export function createViteRuntimeOptions(cacheLabel?: 'main' | 'lab'): {
  root: string
  cacheDir: string
  resolve: { alias: { find: RegExp; replacement: string }[] }
  optimizeDeps: { entries: string[]; include: string[] }
  server: { watch: { ignored: string[] } }
}
