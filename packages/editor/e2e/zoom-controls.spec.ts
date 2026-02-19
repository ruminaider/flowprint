import { test, expect } from '@playwright/test'
import { SEL, EDITOR_URL } from './selectors'

test.describe('Zoom Controls', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(EDITOR_URL('with-nodes'))
    await page.locator(SEL.reactFlow).waitFor({ timeout: 15_000 })
  })

  test('zoom controls are visible', async ({ page }) => {
    await expect(page.locator(SEL.zoomControls)).toBeVisible()
  })

  test('zoom in increases the percentage', async ({ page }) => {
    const percentBtn = page.locator(SEL.zoomPercentage)
    const before = parseInt((await percentBtn.textContent())!.replace('%', ''), 10)

    await page.getByRole('button', { name: 'Zoom in' }).click()

    await expect(percentBtn).not.toHaveText(`${before}%`)
    const after = parseInt((await percentBtn.textContent())!.replace('%', ''), 10)
    expect(after).toBeGreaterThan(before)
  })

  test('zoom out decreases the percentage', async ({ page }) => {
    const percentBtn = page.locator(SEL.zoomPercentage)
    const before = parseInt((await percentBtn.textContent())!.replace('%', ''), 10)

    await page.getByRole('button', { name: 'Zoom out' }).click()

    await expect(percentBtn).not.toHaveText(`${before}%`)
    const after = parseInt((await percentBtn.textContent())!.replace('%', ''), 10)
    expect(after).toBeLessThan(before)
  })

  test('fit to view button works', async ({ page }) => {
    // Change zoom first so fit-to-view has something to do
    await page.getByRole('button', { name: 'Zoom in' }).click()
    await page.getByRole('button', { name: 'Zoom in' }).click()

    const percentBtn = page.locator(SEL.zoomPercentage)
    const zoomedIn = parseInt((await percentBtn.textContent())!.replace('%', ''), 10)

    await page.getByRole('button', { name: 'Fit to view' }).click()

    await expect(percentBtn).not.toHaveText(`${zoomedIn}%`)
  })

  test('clicking percentage opens editable input', async ({ page }) => {
    await page.locator(SEL.zoomPercentage).click()
    await expect(page.locator(SEL.zoomPercentageInput)).toBeVisible()
    await expect(page.locator(SEL.zoomPercentageInput)).toBeFocused()
  })

  test('Escape on input cancels edit', async ({ page }) => {
    await page.locator(SEL.zoomPercentage).click()
    await expect(page.locator(SEL.zoomPercentageInput)).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(page.locator(SEL.zoomPercentageInput)).not.toBeAttached()
    await expect(page.locator(SEL.zoomPercentage)).toBeVisible()
  })
})
