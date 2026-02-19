import { test, expect } from '@playwright/test'
import { SEL, MOD, EDITOR_URL } from './selectors'

test.describe('Command Palette', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(EDITOR_URL('with-nodes'))
    await page.locator(SEL.reactFlow).waitFor({ timeout: 15_000 })
  })

  test('Mod+K opens the command palette', async ({ page }) => {
    await page.keyboard.press(`${MOD}+k`)
    await expect(page.locator(SEL.cmdPalette)).toBeVisible()
  })

  test('input is auto-focused when opened', async ({ page }) => {
    await page.keyboard.press(`${MOD}+k`)
    const input = page.getByLabel('Command search')
    await expect(input).toBeVisible()
    await expect(input).toBeFocused()
  })

  test('Escape closes the palette', async ({ page }) => {
    await page.keyboard.press(`${MOD}+k`)
    await expect(page.locator(SEL.cmdPalette)).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(page.locator(SEL.cmdPalette)).not.toBeAttached()
  })

  test('backdrop click closes the palette', async ({ page }) => {
    await page.keyboard.press(`${MOD}+k`)
    await expect(page.locator(SEL.cmdPalette)).toBeVisible()

    await page.locator(SEL.cmdPaletteBackdrop).click({ force: true })
    await expect(page.locator(SEL.cmdPalette)).not.toBeAttached()
  })

  test('typing filters the command list', async ({ page }) => {
    await page.keyboard.press(`${MOD}+k`)
    const itemsBefore = await page.locator(SEL.cmdPaletteItem).count()

    await page.getByLabel('Command search').fill('action')
    const itemsAfter = await page.locator(SEL.cmdPaletteItem).count()

    expect(itemsAfter).toBeLessThan(itemsBefore)
    expect(itemsAfter).toBeGreaterThan(0)
  })

  test('categories render in the list', async ({ page }) => {
    await page.keyboard.press(`${MOD}+k`)
    await expect(page.locator(SEL.cmdPaletteCategory).first()).toBeVisible()
  })

  test('arrow keys navigate items', async ({ page }) => {
    await page.keyboard.press(`${MOD}+k`)
    await expect(page.locator(SEL.cmdPaletteItemActive)).toBeVisible()

    // First item is active initially (index 0)
    const firstActive = await page.locator(SEL.cmdPaletteItemActive).textContent()

    await page.keyboard.press('ArrowDown')
    const secondActive = await page.locator(SEL.cmdPaletteItemActive).textContent()

    expect(secondActive).not.toBe(firstActive)
  })
})
