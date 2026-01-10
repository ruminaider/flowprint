import { test, expect } from '@playwright/test'

const STORY_BASE = '/iframe.html?viewMode=story&id=editor-flowprinteditor'

test.describe('FlowprintEditor E2E', () => {
  test.describe('Empty story', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`${STORY_BASE}--empty`)
      await page.waitForSelector('.react-flow', { timeout: 15_000 })
    })

    test('node palette renders with 6 node types', async ({ page }) => {
      const palette = page.locator('.fp-palette')
      await expect(palette).toBeVisible()

      const items = page.locator('.fp-palette-item')
      await expect(items).toHaveCount(6)

      // Verify each type is present
      await expect(page.locator('.fp-palette-item-action')).toBeVisible()
      await expect(page.locator('.fp-palette-item-switch')).toBeVisible()
      await expect(page.locator('.fp-palette-item-parallel')).toBeVisible()
      await expect(page.locator('.fp-palette-item-wait')).toBeVisible()
      await expect(page.locator('.fp-palette-item-error')).toBeVisible()
      await expect(page.locator('.fp-palette-item-terminal')).toBeVisible()
    })

    test('lane panel renders with Frontend and Backend lanes', async ({ page }) => {
      const lanePanel = page.locator('.fp-lane-panel')
      await expect(lanePanel).toBeVisible()

      // Lane panel header
      await expect(lanePanel.locator('h3')).toContainText('Lanes')

      // Lane items
      const laneItems = lanePanel.locator('.fp-lane-item')
      await expect(laneItems).toHaveCount(2)

      // Verify lane labels via input values
      const laneInputs = lanePanel.locator('.fp-lane-item input[type="text"]')
      await expect(laneInputs.nth(0)).toHaveValue('Frontend')
      await expect(laneInputs.nth(1)).toHaveValue('Backend')
    })

    test('properties panel shows placeholder when no node selected', async ({ page }) => {
      const panel = page.locator('.fp-panel')
      await expect(panel).toBeVisible()

      const placeholder = page.locator('.fp-panel-placeholder')
      await expect(placeholder).toContainText('Select a node to edit')
    })
  })

  test.describe('WithNodes story', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`${STORY_BASE}--with-nodes`)
      await page.waitForSelector('.react-flow', { timeout: 15_000 })
    })

    test('nodes render with correct type classes', async ({ page }) => {
      // Action node
      const actionNode = page.locator('.fp-node-action')
      await expect(actionNode).toBeVisible()

      // Switch node
      const switchNode = page.locator('.fp-node-switch')
      await expect(switchNode).toBeVisible()

      // Terminal node
      const terminalNode = page.locator('.fp-node-terminal')
      await expect(terminalNode).toBeVisible()
    })

    test('click on a node selects it', async ({ page }) => {
      // Find the action node by its label text
      const actionNode = page.locator('.fp-node-action')
      await expect(actionNode).toBeVisible()

      // Initially should not be selected
      await expect(actionNode).not.toHaveClass(/fp-node-selected/)

      // Click on the node element within React Flow
      await actionNode.click()

      // After clicking, the node should have the selected class
      await expect(actionNode).toHaveClass(/fp-node-selected/)
    })

    test('properties panel shows details for selected node', async ({ page }) => {
      // Click on the action node to select it
      const actionNode = page.locator('.fp-node-action')
      await actionNode.click()

      // Properties panel should show the node type
      const panelHeaderType = page.locator('.fp-panel-header-type')
      await expect(panelHeaderType).toContainText('action')

      // Properties panel should show the node ID
      const panelHeaderId = page.locator('.fp-panel-header-id')
      await expect(panelHeaderId).toContainText('start_action')
    })

    test('Escape key deselects node', async ({ page }) => {
      // Select a node first
      const actionNode = page.locator('.fp-node-action')
      await actionNode.click()
      await expect(actionNode).toHaveClass(/fp-node-selected/)

      // Press Escape
      await page.keyboard.press('Escape')

      // Node should no longer be selected
      await expect(actionNode).not.toHaveClass(/fp-node-selected/)

      // Properties panel should revert to placeholder
      const placeholder = page.locator('.fp-panel-placeholder')
      await expect(placeholder).toContainText('Select a node to edit')
    })

    test('node labels render correctly', async ({ page }) => {
      // Verify node labels
      await expect(page.locator('.fp-node-action .fp-node-label')).toContainText('Start Action')
      await expect(page.locator('.fp-node-switch .fp-node-label')).toContainText('Check Status')
      await expect(page.locator('.fp-node-terminal .fp-node-label')).toContainText('Done')
    })
  })

  test.describe('ReadOnly story', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`${STORY_BASE}--read-only`)
      await page.waitForSelector('.react-flow', { timeout: 15_000 })
    })

    test('read-only mode hides palette', async ({ page }) => {
      const palette = page.locator('.fp-palette')
      await expect(palette).toHaveCount(0)
    })

    test('read-only mode hides properties panel', async ({ page }) => {
      const panel = page.locator('.fp-panel')
      await expect(panel).toHaveCount(0)
    })

    test('read-only mode hides lane panel', async ({ page }) => {
      const lanePanel = page.locator('.fp-lane-panel')
      await expect(lanePanel).toHaveCount(0)
    })

    test('nodes still render in read-only mode', async ({ page }) => {
      await expect(page.locator('.fp-node-action')).toBeVisible()
      await expect(page.locator('.fp-node-switch')).toBeVisible()
      await expect(page.locator('.fp-node-terminal')).toBeVisible()
    })
  })
})
