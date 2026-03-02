import { test, expect } from '@playwright/test'
import { SEL, EDITOR_URL } from './selectors'

test.describe('Trigger node', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(EDITOR_URL('with-trigger'))
    await page.locator(SEL.reactFlow).waitFor({ timeout: 15_000 })
  })

  test('trigger node renders with correct type', async ({ page }) => {
    await expect(page.locator(SEL.node('trigger'))).toBeVisible()
  })

  test('trigger node displays its label', async ({ page }) => {
    const triggerNode = page.locator(SEL.nodeById('on_schedule'))
    await expect(triggerNode).toBeVisible()
    await expect(triggerNode.locator(SEL.nodeName)).toHaveText('Daily Check')
  })

  test('trigger node coexists with action and terminal nodes', async ({ page }) => {
    await expect(page.locator(SEL.node('trigger'))).toBeVisible()
    await expect(page.locator(SEL.node('action'))).toBeVisible()
    await expect(page.locator(SEL.node('terminal'))).toBeVisible()
  })

  test('edges connect trigger to downstream nodes', async ({ page }) => {
    const edges = page.locator(SEL.edge)
    // trigger->action, action->terminal = 2 edges
    await expect(edges).toHaveCount(2)
  })
})
