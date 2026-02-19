import { test, expect } from '@playwright/test'
import { SEL, VIEWER_URL } from './selectors'

test.describe('FlowprintViewer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(VIEWER_URL('prescription-fulfillment'))
    await page.locator(SEL.reactFlow).waitFor({ timeout: 15_000 })
  })

  test('canvas renders', async ({ page }) => {
    await expect(page.locator(SEL.reactFlow)).toBeVisible()
  })

  test('all 6 node types are present', async ({ page }) => {
    for (const type of ['action', 'switch', 'parallel', 'wait', 'error', 'terminal']) {
      await expect(page.locator(SEL.node(type)).first()).toBeAttached()
    }
  })

  test('4 lanes render with correct data-lane-id', async ({ page }) => {
    for (const id of ['patient', 'frontstage', 'backstage', 'support']) {
      await expect(page.locator(SEL.laneById(id))).toBeAttached()
    }
    await expect(page.locator(SEL.lane)).toHaveCount(4)
  })

  test('Line of Visibility is present with badge text', async ({ page }) => {
    await expect(page.locator(SEL.laneLov)).toBeAttached()
    await expect(page.locator(SEL.laneLovBadge)).toHaveText('Line of Visibility')
  })

  test('edges render between connected nodes', async ({ page }) => {
    await expect(page.locator(SEL.edge)).not.toHaveCount(0)
  })

  test('no toolbar, no tab bar, no popover on click', async ({ page }) => {
    await expect(page.locator(SEL.toolbar)).toHaveCount(0)
    await expect(page.locator(SEL.tabBar)).toHaveCount(0)

    // Viewer has elementsSelectable=false so clicking shouldn't trigger anything
    // Use dispatchEvent since viewer nodes aren't meant to be interactive
    await page.locator(SEL.node('action')).first().dispatchEvent('click')
    await expect(page.locator(SEL.popover)).not.toBeAttached()
  })
})
