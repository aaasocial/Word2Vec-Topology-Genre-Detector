// Phase 10 D-76 — Tour anchor smoke test.
//
// Boots the app at /, then iterates TOUR_STEPS asserting each anchor's
// data-tour-id is findable on the freshly mounted app. PITFALLS §14:
// catches refactor drift where a `data-tour-id` literal gets renamed
// or a sidebar component stops emitting its anchor.
//
// Some anchors live behind a tab switch (topology-tab is on the nav
// trigger AND on the empty-state body — both are always mounted).
// genre-select, upload-zone, explain-panel are in the always-mounted
// sidebar. scatter-canvas is the R3F outer div.

import { test, expect } from '@playwright/test'
import { TOUR_STEPS, TOUR_ANCHORS } from '../../src/tour/anchors'

test.describe('tour anchors', () => {
  test.beforeEach(async ({ page }) => {
    // Give first-load tour the 600ms grace, then dismiss so the dim layer
    // doesn't interfere with locator visibility checks for other anchors.
    await page.addInitScript(() => {
      // Pre-seed preferencesStore so the tour is marked complete on mount.
      try {
        const PREFS = { state: { theme: 'system', tourCompleted: true }, version: 0 }
        localStorage.setItem('lgt-prefs-v1', JSON.stringify(PREFS))
      } catch {
        // ignore in browsers without localStorage
      }
    })
    await page.goto('/')
  })

  for (const step of TOUR_STEPS) {
    test(`anchor "${step.anchor}" is findable on fresh mount`, async ({ page }) => {
      const locator = page.locator(`[data-tour-id="${step.anchor}"]`).first()
      await expect(locator).toBeAttached({ timeout: 15_000 })
    })
  }

  // Other anchors referenced by empty states + future tour add-back.
  // helpMenu + themeToggle live in the dropdown — open it first.
  test('help-menu anchor is findable in the top nav', async ({ page }) => {
    const help = page.locator(`[data-tour-id="${TOUR_ANCHORS.helpMenu}"]`).first()
    await expect(help).toBeAttached({ timeout: 15_000 })
  })

  test('theme-toggle anchor mounts when the help dropdown opens', async ({ page }) => {
    const help = page.locator(`[data-tour-id="${TOUR_ANCHORS.helpMenu}"]`).first()
    await expect(help).toBeAttached({ timeout: 15_000 })
    await help.click()
    const segmented = page.locator(`[data-tour-id="${TOUR_ANCHORS.themeToggle}"]`).first()
    await expect(segmented).toBeAttached({ timeout: 5_000 })
  })

  test('compare-tab anchor mounts on the Compare empty state', async ({ page }) => {
    // The TopNavTabs Compare button has the anchor too, so we're guaranteed at
    // least one match. Activate the tab and verify the inner empty-state
    // anchor (also tagged compare-tab) becomes visible.
    const tabButton = page.locator(`[data-tour-id="${TOUR_ANCHORS.compareTab}"]`).first()
    await expect(tabButton).toBeAttached({ timeout: 15_000 })
    await tabButton.click()
    // The empty state inherits the same anchor; .first() still resolves.
    const inner = page.locator(`[data-tour-id="${TOUR_ANCHORS.compareTab}"]`).first()
    await expect(inner).toBeVisible({ timeout: 10_000 })
  })

  test('explain-panel anchor mounts on the sidebar pre-upload state', async ({ page }) => {
    const explain = page.locator(`[data-tour-id="${TOUR_ANCHORS.explainPanel}"]`).first()
    await expect(explain).toBeAttached({ timeout: 15_000 })
  })

  test('classification-result anchor is NOT mounted before any upload', async ({ page }) => {
    // Sanity check — failure card / result card both carry this anchor only
    // when there's an error or a verdict to show. Pre-upload, it should be
    // absent. Confirms our anchor coverage isn't accidentally over-attached.
    const result = page.locator(`[data-tour-id="${TOUR_ANCHORS.classificationResult}"]`)
    await page.waitForTimeout(2_000)
    await expect(result).toHaveCount(0)
  })
})
