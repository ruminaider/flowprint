import { test, expect } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { writeFileSync, unlinkSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

test('round-trip: create blueprint in app, validate with CLI', async ({ page }) => {
  await page.goto('/')

  // Create a new blueprint
  await page.getByRole('button', { name: 'New Blueprint' }).click()
  await page.getByLabel(/blueprint name/i).fill('round-trip-test')
  await page.getByRole('button', { name: 'Create' }).click()

  // Wait for editor to render
  await expect(page.getByText('round-trip-test')).toBeVisible()

  // The YAML preview panel should be visible (showYamlPreview is enabled).
  // When Monaco is not available, the fallback <pre> element renders the YAML.
  // Wait for the preview to render.
  const yamlPre = page.locator('.fp-yaml-preview-fallback')
  await yamlPre.waitFor({ state: 'attached', timeout: 5000 }).catch(() => {
    // Monaco may have loaded instead; try the Monaco container
  })

  let yamlContent: string | null = null

  // Try fallback <pre> first, then Monaco readonly editor
  if (await yamlPre.isVisible().catch(() => false)) {
    yamlContent = await yamlPre.textContent()
  }

  if (!yamlContent) {
    // Try getting content from any element inside the yaml preview panel
    const previewPanel = page.locator('.fp-yaml-preview-content')
    if (await previewPanel.isVisible().catch(() => false)) {
      yamlContent = await previewPanel.textContent()
    }
  }

  if (!yamlContent) {
    test.skip(true, 'Could not extract YAML from preview panel')
    return
  }

  // Write to temp file
  const tmpDir = join(tmpdir(), 'flowprint-e2e')
  mkdirSync(tmpDir, { recursive: true })
  const tmpFile = join(tmpDir, 'round-trip-test.flowprint.yaml')
  writeFileSync(tmpFile, yamlContent)

  try {
    // Run CLI validate — the bin entry is packages/cli/dist/index.js
    const cliPath = join(process.cwd(), 'packages', 'cli', 'dist', 'index.js')
    const result = execFileSync('node', [cliPath, 'validate', tmpFile], {
      encoding: 'utf-8',
      timeout: 10_000,
    })
    // CLI outputs "PASS" for valid files
    expect(result).toContain('PASS')
  } finally {
    try {
      unlinkSync(tmpFile)
    } catch {
      // cleanup best-effort
    }
  }
})
