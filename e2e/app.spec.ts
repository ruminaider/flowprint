import { test, expect } from '@playwright/test'

test('app loads successfully', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/Flowprint/)
})

test('welcome screen shows action buttons', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Open File' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'New Blueprint' })).toBeVisible()
})

test('new blueprint wizard opens and creates document', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'New Blueprint' }).click()

  // Fill in the wizard
  const nameInput = page.getByLabel(/blueprint name/i)
  await nameInput.fill('test-service')

  // Click Create
  await page.getByRole('button', { name: 'Create' }).click()

  // Should now show the editor (welcome screen gone, header shows file name)
  await expect(page.getByText('test-service', { exact: true })).toBeVisible()
})

test('settings dialog opens', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Settings' }).click()

  // Settings dialog should be visible
  await expect(page.getByText(/repository root/i)).toBeVisible()
  await expect(page.getByText(/code-search url/i)).toBeVisible()
})

test('theme toggle cycles through modes', async ({ page }) => {
  await page.goto('/')
  const themeButton = page.getByRole('button', { name: /theme/i })

  // Default is System
  await expect(themeButton).toContainText('System')

  // Click to cycle
  await themeButton.click()
  await expect(themeButton).toContainText('Light')

  await themeButton.click()
  await expect(themeButton).toContainText('Dark')

  await themeButton.click()
  await expect(themeButton).toContainText('System')
})
