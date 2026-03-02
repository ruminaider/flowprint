import { test, expect } from '@playwright/test'
import { SEL, EDITOR_URL } from './selectors'

test.describe('Toolbar', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(EDITOR_URL('with-nodes'))
    await page.locator(SEL.reactFlow).waitFor({ timeout: 15_000 })
  })

  test('toolbar is visible', async ({ page }) => {
    await expect(page.locator(SEL.toolbar)).toBeVisible()
  })

  test('Select tool is active by default', async ({ page }) => {
    const selectBtn = page.getByRole('button', { name: 'Select' })
    await expect(selectBtn).toBeVisible()
    await expect(selectBtn).toHaveClass(/fp-toolbar__button--active/)
  })

  test('clicking Hand tool switches active tool', async ({ page }) => {
    const handBtn = page.getByRole('button', { name: 'Hand' })
    const selectBtn = page.getByRole('button', { name: 'Select' })

    await handBtn.click()
    await expect(handBtn).toHaveClass(/fp-toolbar__button--active/)
    await expect(selectBtn).not.toHaveClass(/fp-toolbar__button--active/)
  })

  test('all 7 node type buttons are present', async ({ page }) => {
    for (const name of ['Action', 'Switch', 'Parallel', 'Wait', 'Error', 'Terminal', 'Trigger']) {
      await expect(page.getByRole('button', { name })).toBeVisible()
    }
  })

  test('toolbar has divider elements', async ({ page }) => {
    const dividers = page.locator(SEL.toolbarDivider)
    await expect(dividers).not.toHaveCount(0)
  })

  test('Tidy Layout button is present', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Tidy Layout' })).toBeVisible()
  })

  test('Command Palette button is present', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Command Palette' })).toBeVisible()
  })
})
