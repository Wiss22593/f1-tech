import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createViteRuntimeOptions } from './scripts/vite-runtime.mjs'

export default defineConfig({
  ...createViteRuntimeOptions('main'),
  plugins: [react()],
})
