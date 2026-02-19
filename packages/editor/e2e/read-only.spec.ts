import { test, expect } from '@playwright/test'
import { SEL, EDITOR_URL, clickNode } from './selectors'

test.describe('Read-only mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(EDITOR_URL('read-only'))
    await page.locator(SEL.reactFlow).waitFor({ timeout: 15_000 })
  })

  test('toolbar is hidden', async ({ page }) => {
    await expect(page.locator(SEL.toolbar)).toHaveCount(0)
  })

  test('clicking a node does NOT open a popover', async ({ page }) => {
    await clickNode(page, 'start_action')
    await expect(page.locator(SEL.popover)).not.toBeAttached()
  })

  test('clicking a node does NOT add selected class', async ({ page }) => {
    await clickNode(page, 'start_action')
    await expect(page.locator(SEL.nodeSelected)).toHaveCount(0)
  })

  test('zoom controls still work', async ({ page }) => {
    await expect(page.locator(SEL.zoomControls)).toBeVisible()

    const percentBtn = page.locator(SEL.zoomPercentage)
    const before = parseInt((await percentBtn.textContent())!.replace('%', ''), 10)

    await page.getByRole('button', { name: 'Zoom in' }).click()
    const after = parseInt((await percentBtn.textContent())!.replace('%', ''), 10)
    expect(after).toBeGreaterThan(before)
  })

  test('lanes are visible', async ({ page }) => {
    await expect(page.locator(SEL.laneById('frontend'))).toBeAttached()
    await expect(page.locator(SEL.laneById('backend'))).toBeAttached()
  })

  test('edges are visible', async ({ page }) => {
    await expect(page.locator(SEL.edge)).not.toHaveCount(0)
  })
})
