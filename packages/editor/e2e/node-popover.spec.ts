import { test, expect } from '@playwright/test'
import { SEL, EDITOR_URL } from './selectors'

test.describe('Node Popover', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(EDITOR_URL('with-nodes'))
    await page.locator(SEL.reactFlow).waitFor({ timeout: 15_000 })
  })

  test('clicking a node opens the popover', async ({ page }) => {
    await page.locator(SEL.nodeById('start_action')).click()
    await expect(page.locator(SEL.popover)).toBeVisible()
  })

  test('popover header shows node info', async ({ page }) => {
    await page.locator(SEL.nodeById('start_action')).click()
    const header = page.locator(SEL.popoverHeader)
    await expect(header).toBeVisible()
    await expect(header).toContainText('Action')
  })

  test('"Open Full Editor" button is present', async ({ page }) => {
    await page.locator(SEL.nodeById('start_action')).click()
    await expect(page.locator(SEL.popoverOpenEditor)).toBeVisible()
    await expect(page.locator(SEL.popoverOpenEditor)).toHaveText('Open Full Editor')
  })

  test('"Open Full Editor" opens a node tab', async ({ page }) => {
    await page.locator(SEL.nodeById('start_action')).click()
    await page.locator(SEL.popoverOpenEditor).click()
    await expect(page.locator(SEL.tabById('start_action'))).toBeVisible()
    await expect(page.locator(SEL.tabById('start_action'))).toHaveClass(/fp-tab--active/)
  })

  test('Escape closes the popover', async ({ page }) => {
    await page.locator(SEL.nodeById('start_action')).click()
    await expect(page.locator(SEL.popover)).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(page.locator(SEL.popover)).not.toBeAttached()
  })
})
