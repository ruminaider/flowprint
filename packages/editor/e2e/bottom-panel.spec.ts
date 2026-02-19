import { test, expect } from '@playwright/test'
import { SEL, MOD, EDITOR_URL } from './selectors'

test.describe('Bottom Panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(EDITOR_URL('with-nodes'))
    await page.locator(SEL.reactFlow).waitFor({ timeout: 15_000 })
  })

  test('panel is not visible by default on load', async ({ page }) => {
    await expect(page.locator(SEL.bottomPanel)).not.toBeAttached()
  })

  test('Mod+J opens the bottom panel', async ({ page }) => {
    await page.keyboard.press(`${MOD}+j`)
    await expect(page.locator(SEL.bottomPanel)).toBeVisible()
  })

  test('YAML tab is active by default', async ({ page }) => {
    await page.keyboard.press(`${MOD}+j`)
    const yamlTab = page.locator(SEL.bottomPanelTab).filter({ hasText: 'YAML' })
    await expect(yamlTab).toHaveClass(/fp-bottom-panel__tab--active/)
  })

  test('YAML content contains schema and node IDs', async ({ page }) => {
    await page.keyboard.press(`${MOD}+j`)
    const yaml = page.locator(SEL.bottomPanelYaml)
    await expect(yaml).toBeVisible()

    const text = await yaml.textContent()
    expect(text).toContain('flowprint/1.0')
    expect(text).toContain('start_action')
    expect(text).toContain('check_status')
    expect(text).toContain('done')
  })

  test('switching to Validation tab works', async ({ page }) => {
    await page.keyboard.press(`${MOD}+j`)
    const validationTab = page.locator(SEL.bottomPanelTab).filter({ hasText: 'Validation' })
    await validationTab.click()
    await expect(validationTab).toHaveClass(/fp-bottom-panel__tab--active/)

    const yamlTab = page.locator(SEL.bottomPanelTab).filter({ hasText: 'YAML' })
    await expect(yamlTab).not.toHaveClass(/fp-bottom-panel__tab--active/)
  })

  test('close button closes the panel', async ({ page }) => {
    await page.keyboard.press(`${MOD}+j`)
    await expect(page.locator(SEL.bottomPanel)).toBeVisible()

    await page.getByRole('button', { name: 'Close panel' }).click()
    await expect(page.locator(SEL.bottomPanel)).not.toBeAttached()
  })

  test('Mod+J toggles the panel open and closed', async ({ page }) => {
    await page.keyboard.press(`${MOD}+j`)
    await expect(page.locator(SEL.bottomPanel)).toBeVisible()

    await page.keyboard.press(`${MOD}+j`)
    await expect(page.locator(SEL.bottomPanel)).not.toBeAttached()
  })
})
