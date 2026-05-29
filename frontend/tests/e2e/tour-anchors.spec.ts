// Reading Room — tour-anchor smoke test (Phase 12).
//
// The Phase 10/11 tabbed indigo shell (and its anchors: scatter-canvas,
// genre-select, upload-zone, topology-tab, help-menu, theme-toggle, compare-tab,
// explain-panel) was replaced wholesale by the reading-room masthead shell in
// 12-01 (D-U2). The live screens carry the reading-room anchors instead:
//   plate · catalog-rail   (Collection, 12-02)
//   catalog-card           (Card, 12-03)
//   topology-plate         (Topology, 12-05)
//   study-pickers          (Study, 12-03)
//   reading-desk           (Submit a Text, 12-04)
//
// This smoke navigates the masthead router (via the readingRoomStore) to each
// screen and asserts its anchor mounts — catching refactor drift where a
// `data-tour-id` literal gets renamed or a screen stops emitting its anchor
// (PITFALLS §14). The full 6-stop tour script lands in 12-06; this file tracks
// the anchors that exist today so the suite stays green through the rewrite.

import { test, expect } from '@playwright/test'

test.describe('reading-room tour anchors', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('collection plate + catalog-rail anchors mount', async ({ page }) => {
    // Navigate via the masthead "The Collection" item.
    await page.getByRole('button', { name: /the collection/i }).first().click()
    await expect(page.locator('[data-tour-id="plate"]').first()).toBeAttached({ timeout: 15_000 })
    await expect(page.locator('[data-tour-id="catalog-rail"]').first()).toBeAttached({ timeout: 15_000 })
  })

  test('topology-plate anchor mounts once a region is selected', async ({ page }) => {
    // Masthead "Topology" item → the Topology screen (empty until a region).
    await page.getByRole('button', { name: /^topology$/i }).first().click()
    // The framed VR viewer (data-tour-id="topology-plate") only renders after a
    // region is chosen — the 12-06 tour pre-selects Mystery; here we click it.
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
})
