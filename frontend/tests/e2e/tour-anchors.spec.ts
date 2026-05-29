// Reading Room — tour-anchor smoke test (Phase 12, 12-06).
//
// The Phase 10/11 tabbed indigo shell (and its anchors: scatter-canvas,
// genre-select, upload-zone, topology-tab, …) was replaced wholesale by the
// reading-room masthead shell in 12-01 (D-U2). The live screens carry the six
// reading-room anchors the 6-stop guided tour frames:
//   ① plate · ② catalog-rail   (Collection, 12-02)
//   ③ catalog-card             (Card, 12-03)
//   ④ topology-plate           (Topology, 12-05 — tour pre-selects Mystery)
//   ⑤ study-pickers            (Study, 12-03)
//   ⑥ reading-desk             (Submit a Text, 12-04)
//
// Two layers of coverage:
//   1. Per-screen masthead navigation asserts each masthead-reachable anchor
//      mounts (catches a renamed `data-tour-id` or a screen that stops emitting
//      its anchor — PITFALLS §14).
//   2. The full 6-stop guided tour (RR-08): begin it from the Guide and step
//      through all six stops, asserting each step's anchor + margin card frame.
//      The tour navigates the REAL screens itself — including the Card screen,
//      which has no masthead item — and pre-selects Mystery at the Topology stop.

import { test, expect, type Page } from '@playwright/test'

test.describe('reading-room tour anchors', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // First visit auto-opens the Guide (rr.guide.seen.v1). Close it so the
    // masthead-navigation tests interact with the screens beneath.
    await dismissGuideIfOpen(page)
  })

  test('collection plate + catalog-rail anchors mount', async ({ page }) => {
    await page.getByRole('button', { name: /the collection/i }).first().click()
    await expect(page.locator('[data-tour-id="plate"]').first()).toBeAttached({ timeout: 15_000 })
    await expect(page.locator('[data-tour-id="catalog-rail"]').first()).toBeAttached({
      timeout: 15_000,
    })
  })

  test('topology-plate anchor mounts once a region is selected', async ({ page }) => {
    await page.getByRole('button', { name: /^topology$/i }).first().click()
    // The framed VR hero only renders after a region is chosen (the tour
    // pre-selects Mystery; here we click it).
    await page.getByRole('button', { name: /mystery/i }).first().click()
    await expect(page.locator('[data-tour-id="topology-plate"]').first()).toBeAttached({
      timeout: 15_000,
    })
  })

  test('study-pickers anchor mounts on the Comparative Study folio', async ({ page }) => {
    await page.getByRole('button', { name: /a comparative study/i }).first().click()
    await expect(page.locator('[data-tour-id="study-pickers"]').first()).toBeAttached({
      timeout: 15_000,
    })
  })

  test('reading-desk anchor mounts on Submit a Text', async ({ page }) => {
    await page.getByRole('button', { name: /submit a text/i }).first().click()
    await expect(page.locator('[data-tour-id="reading-desk"]').first()).toBeAttached({
      timeout: 15_000,
    })
  })

  test('the 6-stop guided tour frames each anchor on its real screen', async ({ page }) => {
    // Reopen the Guide from the masthead (its accessible name is "? Guide"),
    // then begin the guided tour from the "How to wander" tab.
    await page.getByRole('banner').getByRole('button', { name: /guide/i }).click()
    await page.getByRole('button', { name: /how to wander/i }).first().click()
    await page.getByRole('button', { name: /begin the guided tour/i }).first().click()

    // The 6 stops, in masthead reading order, with the anchor each frames.
    const stops = [
      'plate',
      'catalog-rail',
      'catalog-card',
      'topology-plate',
      'study-pickers',
      'reading-desk',
    ]

    for (let i = 0; i < stops.length; i++) {
      // Margin card reports STOP n/6.
      await expect(page.getByText(`STOP ${i + 1} / 6`)).toBeVisible({ timeout: 15_000 })
      // The current stop's anchor must be mounted on the navigated screen.
      await expect(page.locator(`[data-tour-id="${stops[i]}"]`).first()).toBeAttached({
        timeout: 15_000,
      })
      if (i < stops.length - 1) {
        await page.getByRole('button', { name: /next →/i }).first().click()
      }
    }

    // Last stop shows "Done"; ending the tour tears the overlay down.
    await page.getByRole('button', { name: /done/i }).first().click()
    await expect(page.getByText('STOP 6 / 6')).toBeHidden({ timeout: 15_000 })
  })
})

/** Close the auto-opened Guide side-sheet if present (first-visit behaviour). */
async function dismissGuideIfOpen(page: Page) {
  const close = page.getByRole('button', { name: /close ×/i }).first()
  if (await close.isVisible().catch(() => false)) {
    await close.click()
    await expect(close).toBeHidden({ timeout: 5_000 }).catch(() => {})
  }
}
