import { test, expect } from '@playwright/test'
import { SEL, EDITOR_URL } from './selectors'

test.describe('Tabs', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(EDITOR_URL('with-nodes'))
    await page.locator(SEL.reactFlow).waitFor({ timeout: 15_000 })
  })

  test('tab bar is visible with Graph tab', async ({ page }) => {
    await expect(page.locator(SEL.tabBar)).toBeVisible()
    await expect(page.locator('[data-testid="tab-graph"]')).toBeVisible()
  })

  test('Graph tab is active by default', async ({ page }) => {
    const graphTab = page.locator('[data-testid="tab-graph"]')
    await expect(graphTab).toHaveClass(/fp-tab--active/)
  })

  test('Graph tab has no close button', async ({ page }) => {
    const graphTab = page.locator('[data-testid="tab-graph"]')
    await expect(graphTab.locator(SEL.tabClose)).not.toBeAttached()
  })

  test('double-clicking a node opens a node tab', async ({ page }) => {
    await page.locator(SEL.nodeById('start_action')).dblclick()
    const nodeTab = page.locator(SEL.tabById('start_action'))
    await expect(nodeTab).toBeVisible()
    await expect(nodeTab).toHaveClass(/fp-tab--active/)
  })

  test('clicking Graph tab switches back to canvas', async ({ page }) => {
    // Open a node tab first
    await page.locator(SEL.nodeById('start_action')).dblclick()
    await expect(page.locator(SEL.tabById('start_action'))).toHaveClass(/fp-tab--active/)

    // Switch back to Graph
    await page.locator('[data-testid="tab-graph"]').click()
    await expect(page.locator('[data-testid="tab-graph"]')).toHaveClass(/fp-tab--active/)
    await expect(page.locator(SEL.editorCanvas)).toBeVisible()
  })

  test('node tab close button removes the tab', async ({ page }) => {
    await page.locator(SEL.nodeById('start_action')).dblclick()
    const nodeTab = page.locator(SEL.tabById('start_action'))
    await expect(nodeTab).toBeVisible()

    await nodeTab.locator(SEL.tabClose).click()
    await expect(nodeTab).not.toBeAttached()
  })
})
