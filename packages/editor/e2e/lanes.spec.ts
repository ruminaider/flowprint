import { test, expect } from '@playwright/test'
import { SEL, EDITOR_URL, VIEWER_URL } from './selectors'

test.describe('Lanes', () => {
  test.describe('Editor (with-nodes)', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(EDITOR_URL('with-nodes'))
      await page.locator(SEL.reactFlow).waitFor({ timeout: 15_000 })
    })

    test('2 lanes render with correct data-lane-id', async ({ page }) => {
      await expect(page.locator(SEL.laneById('frontend'))).toBeAttached()
      await expect(page.locator(SEL.laneById('backend'))).toBeAttached()
      await expect(page.locator(SEL.lane)).toHaveCount(2)
    })
  })

  test.describe('Viewer (prescription-fulfillment)', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(VIEWER_URL('prescription-fulfillment'))
      await page.locator(SEL.reactFlow).waitFor({ timeout: 15_000 })
    })

    test('4 lanes render', async ({ page }) => {
      await expect(page.locator(SEL.laneById('patient'))).toBeAttached()
      await expect(page.locator(SEL.laneById('frontstage'))).toBeAttached()
      await expect(page.locator(SEL.laneById('backstage'))).toBeAttached()
      await expect(page.locator(SEL.laneById('support'))).toBeAttached()
      await expect(page.locator(SEL.lane)).toHaveCount(4)
    })

    test('Line of Visibility renders', async ({ page }) => {
      await expect(page.locator(SEL.laneLov)).toBeAttached()
    })

    test('LoV badge text says "Line of Visibility"', async ({ page }) => {
      await expect(page.locator(SEL.laneLovBadge)).toHaveText('Line of Visibility')
    })

    test('all 6 node types render', async ({ page }) => {
      for (const type of ['action', 'switch', 'parallel', 'wait', 'error', 'terminal']) {
        await expect(page.locator(SEL.node(type))).toBeAttached()
      }
    })
  })
})
