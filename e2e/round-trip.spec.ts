import { test, expect } from '@playwright/test'

const MOD = process.platform === 'darwin' ? 'Meta' : 'Control'

test('round-trip: create blueprint, verify YAML in bottom panel', async ({ page }) => {
  await page.goto('/')

  // Create a new blueprint
  await page.getByRole('button', { name: 'New Blueprint' }).click()
  await page.getByLabel(/blueprint name/i).fill('e2e-round-trip')
  await page.getByRole('button', { name: 'Create' }).click()

  // Wait for editor to load
  await page.locator('.react-flow').waitFor({ timeout: 15_000 })

  // Open bottom panel with Mod+J
  await page.keyboard.press(`${MOD}+j`)
  await expect(page.locator('.fp-bottom-panel')).toBeVisible()

  // Read YAML content
  const yaml = page.locator('.fp-bottom-panel__yaml')
  await expect(yaml).toBeVisible()

  const text = await yaml.textContent()
  expect(text).toContain('flowprint/1.0')
  expect(text).toContain('e2e-round-trip')
})
