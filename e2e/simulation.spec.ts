import { test, expect } from '@playwright/test'

test.describe('simulation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')

    // Create a new blueprint so doc is loaded and Simulate button appears
    await page.getByRole('button', { name: 'New Blueprint' }).click()
    await page.getByLabel(/blueprint name/i).fill('sim-test')
    await page.getByRole('button', { name: 'Create' }).click()

    // Wait for editor to appear
    await expect(page.getByText('sim-test', { exact: true })).toBeVisible()
  })

  test('simulate button appears and opens panel', async ({ page }) => {
    const simBtn = page.getByRole('button', { name: 'Simulate' })
    await expect(simBtn).toBeVisible()

    await simBtn.click()

    // Simulation panel should appear with input textarea
    await expect(page.getByText('Input JSON')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Run' })).toBeVisible()
  })

  test('run simulation shows step counter and highlights', async ({ page }) => {
    // Open simulation panel
    await page.getByRole('button', { name: 'Simulate' }).click()

    // Run with default empty input
    await page.getByRole('button', { name: 'Run' }).click()

    // Step counter should appear
    await expect(page.getByText(/Step \d+ of \d+/)).toBeVisible()

    // At least one node should have an active highlight
    await expect(page.locator('.fp-node--sim-active')).toBeVisible()
  })

  test('stop simulation closes panel', async ({ page }) => {
    await page.getByRole('button', { name: 'Simulate' }).click()
    await page.getByRole('button', { name: 'Run' }).click()

    // Wait for simulation to load
    await expect(page.getByText(/Step \d+ of \d+/)).toBeVisible()

    // Stop the simulation — panel closes entirely
    await page.getByRole('button', { name: 'Stop' }).click()

    // Panel should be gone
    await expect(page.getByText(/Step \d+ of \d+/)).not.toBeVisible()
    await expect(page.getByRole('button', { name: 'Simulate' })).toBeVisible()
  })

  test('close simulation hides panel', async ({ page }) => {
    await page.getByRole('button', { name: 'Simulate' }).click()
    await expect(page.getByText('Input JSON')).toBeVisible()

    // Close the panel
    await page.getByRole('button', { name: 'Close' }).click()

    // Panel should be gone, button should say Simulate (not Simulating)
    await expect(page.getByText('Input JSON')).not.toBeVisible()
    await expect(page.getByRole('button', { name: 'Simulate' })).toBeVisible()
  })

  test('invalid JSON input shows error', async ({ page }) => {
    await page.getByRole('button', { name: 'Simulate' }).click()

    // Enter invalid JSON
    const textarea = page.locator('textarea').first()
    await textarea.fill('not valid json')

    await page.getByRole('button', { name: 'Run' }).click()

    // Error message should appear
    await expect(page.getByText('Invalid JSON input')).toBeVisible()
  })
})
