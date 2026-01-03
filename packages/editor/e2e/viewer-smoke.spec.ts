import { test, expect } from '@playwright/test'

test.describe('FlowprintViewer smoke test', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the PrescriptionFulfillment story
    await page.goto(
      '/iframe.html?id=flowprintviewer--prescription-fulfillment&viewMode=story',
    )
    // Wait for React Flow to render
    await page.waitForSelector('.react-flow', { timeout: 15000 })
  })

  test('renders all 6 node types', async ({ page }) => {
    // Check for action nodes
    const actionNodes = page.locator('.fp-node-action')
    await expect(actionNodes.first()).toBeVisible()

    // Check for switch node
    const switchNodes = page.locator('.fp-node-switch')
    await expect(switchNodes.first()).toBeVisible()

    // Check for parallel node
    const parallelNodes = page.locator('.fp-node-parallel')
    await expect(parallelNodes.first()).toBeVisible()

    // Check for wait node
    const waitNodes = page.locator('.fp-node-wait')
    await expect(waitNodes.first()).toBeVisible()

    // Check for error node
    const errorNodes = page.locator('.fp-node-error')
    await expect(errorNodes.first()).toBeVisible()

    // Check for terminal nodes
    const terminalNodes = page.locator('.fp-node-terminal')
    await expect(terminalNodes.first()).toBeVisible()
  })

  test('renders lane backgrounds', async ({ page }) => {
    const laneBands = page.locator('.fp-lane-band')
    await expect(laneBands).toHaveCount(4)
  })

  test('renders lane labels', async ({ page }) => {
    const laneLabels = page.locator('.fp-lane-label')
    await expect(laneLabels).toHaveCount(4)

    await expect(laneLabels.nth(0)).toContainText('Patient Actions')
    await expect(laneLabels.nth(1)).toContainText('Frontstage')
    await expect(laneLabels.nth(2)).toContainText('Backstage')
    await expect(laneLabels.nth(3)).toContainText('External Partners')
  })

  test('renders line of visibility', async ({ page }) => {
    const lov = page.locator('.fp-line-of-visibility')
    await expect(lov).toBeVisible()

    const lovLabel = page.locator('.fp-lov-label')
    await expect(lovLabel).toContainText('Line of Visibility')
  })

  test('renders edges', async ({ page }) => {
    // React Flow renders edges as SVG paths
    const edges = page.locator('.react-flow__edge')
    const count = await edges.count()
    expect(count).toBeGreaterThan(0)
  })
})
