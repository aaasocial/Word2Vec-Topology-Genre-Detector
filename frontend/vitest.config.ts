import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react() as any],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    coverage: { provider: 'v8', reporter: ['text', 'lcov'] },
    // Phase 10 Task 11: keep Playwright e2e specs out of the Vitest run.
    exclude: ['node_modules', 'tests/e2e/**', 'dist'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
