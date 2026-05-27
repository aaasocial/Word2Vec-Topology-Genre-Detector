// Phase 10 D-76 — Playwright config for the tour-anchor smoke test.
//
// Single-browser (Chromium) for CI speed; baseURL points at the Vite dev
// server. The webServer block boots Vite automatically if it isn't already
// running on the host machine.

import { defineConfig, devices } from '@playwright/test'

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? '5173')

export default defineConfig({
  testDir: './tests/e2e',
  // Generous timeout — the app needs a few seconds for the 154-book scatter
  // payload + R3F canvas to mount.
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
    headless: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: `npm run dev -- --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
