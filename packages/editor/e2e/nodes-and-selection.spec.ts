import { test, expect } from '@playwright/test'
import { SEL, EDITOR_URL, clickNode } from './selectors'

test.describe('Nodes and selection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(EDITOR_URL('with-nodes'))
    await page.locator(SEL.reactFlow).waitFor({ timeout: 15_000 })
  })

  test('renders all 3 node types with correct data-node-type', async ({ page }) => {
    await expect(page.locator(SEL.node('action'))).toBeVisible()
    await expect(page.locator(SEL.node('switch'))).toBeVisible()
    await expect(page.locator(SEL.node('terminal'))).toBeVisible()
  })

  test('nodes have data-testid attributes', async ({ page }) => {
    await expect(page.locator(SEL.nodeById('start_action'))).toBeVisible()
    await expect(page.locator(SEL.nodeById('check_status'))).toBeVisible()
    await expect(page.locator(SEL.nodeById('done'))).toBeVisible()
  })

  test('node labels are visible', async ({ page }) => {
    const names = page.locator(SEL.nodeName)
    await expect(names).toHaveCount(3)
    await expect(names.filter({ hasText: 'Start Action' })).toBeVisible()
    await expect(names.filter({ hasText: 'Check Status' })).toBeVisible()
    await expect(names.filter({ hasText: 'Done' })).toBeVisible()
  })

  test('clicking a node selects it', async ({ page }) => {
    await clickNode(page, 'start_action')
    await expect(page.locator(SEL.nodeSelected)).toHaveCount(1)
    await expect(page.locator(SEL.nodeById('start_action'))).toHaveClass(/fp-node--selected/)
  })

  test('clicking canvas background deselects all nodes', async ({ page }) => {
    await clickNode(page, 'start_action')
    await expect(page.locator(SEL.nodeSelected)).toHaveCount(1)

    // Click on the React Flow pane (canvas background)
    await page.locator('.react-flow__pane').dispatchEvent('click')
    await expect(page.locator(SEL.nodeSelected)).toHaveCount(0)
  })

  test('edges render between connected nodes', async ({ page }) => {
    const edges = page.locator(SEL.edge)
    await expect(edges).not.toHaveCount(0)
  })

  test('clicking a different node deselects the previous one', async ({ page }) => {
    await clickNode(page, 'start_action')
    await expect(page.locator(SEL.nodeById('start_action'))).toHaveClass(/fp-node--selected/)

    await clickNode(page, 'check_status')
    await expect(page.locator(SEL.nodeById('check_status'))).toHaveClass(/fp-node--selected/)
    await expect(page.locator(SEL.nodeById('start_action'))).not.toHaveClass(/fp-node--selected/)
    await expect(page.locator(SEL.nodeSelected)).toHaveCount(1)
  })
})
