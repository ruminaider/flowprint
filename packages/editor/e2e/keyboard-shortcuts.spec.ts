import { test, expect } from '@playwright/test'
import { SEL, MOD, EDITOR_URL, clickNode } from './selectors'

test.describe('Keyboard shortcuts', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(EDITOR_URL('with-nodes'))
    await page.locator(SEL.reactFlow).waitFor({ timeout: 15_000 })
  })

  test('V key activates Select tool', async ({ page }) => {
    // Switch to Hand first, then press V
    await page.keyboard.press('h')
    await expect(page.getByRole('button', { name: 'Hand' })).toHaveClass(/fp-toolbar__button--active/)

    await page.keyboard.press('v')
    await expect(page.getByRole('button', { name: 'Select' })).toHaveClass(/fp-toolbar__button--active/)
  })

  test('H key activates Hand tool', async ({ page }) => {
    await page.keyboard.press('h')
    await expect(page.getByRole('button', { name: 'Hand' })).toHaveClass(/fp-toolbar__button--active/)
    await expect(page.getByRole('button', { name: 'Select' })).not.toHaveClass(/fp-toolbar__button--active/)
  })

  test('Mod+K opens command palette', async ({ page }) => {
    await page.keyboard.press(`${MOD}+k`)
    await expect(page.locator(SEL.cmdPalette)).toBeVisible()
  })

  test('Mod+J toggles bottom panel', async ({ page }) => {
    await page.keyboard.press(`${MOD}+j`)
    await expect(page.locator(SEL.bottomPanel)).toBeVisible()

    await page.keyboard.press(`${MOD}+j`)
    await expect(page.locator(SEL.bottomPanel)).not.toBeAttached()
  })

  test('Escape closes popover', async ({ page }) => {
    await clickNode(page, 'start_action')
    await expect(page.locator(SEL.popover)).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(page.locator(SEL.popover)).not.toBeAttached()
  })

  test('Delete removes a selected node', async ({ page }) => {
    await clickNode(page, 'start_action')
    await expect(page.locator(SEL.nodeSelected)).toHaveCount(1)

    await page.keyboard.press('Delete')
    await expect(page.locator(SEL.nodeById('start_action'))).not.toBeAttached()
  })

  test('shortcuts are suppressed when typing in an input field', async ({ page }) => {
    // Open command palette (which has an input)
    await page.keyboard.press(`${MOD}+k`)
    await expect(page.locator(SEL.cmdPalette)).toBeVisible()

    // Type 'v' and 'h' in the palette input — should NOT switch tools
    await page.getByLabel('Command search').fill('vh')

    // Close palette
    await page.keyboard.press('Escape')

    // Select tool should still be active (V/H didn't fire)
    await expect(page.getByRole('button', { name: 'Select' })).toHaveClass(/fp-toolbar__button--active/)
    await expect(page.getByRole('button', { name: 'Hand' })).not.toHaveClass(/fp-toolbar__button--active/)
  })
})
