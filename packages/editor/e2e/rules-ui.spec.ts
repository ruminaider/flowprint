import { test, expect } from '@playwright/test'
import { SEL, EDITOR_URL, clickNode, dblClickNode } from './selectors'

test.describe('Rules UI Integration', () => {
  test.describe('Action node with rules', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(EDITOR_URL('with-rules-action'))
      await page.locator(SEL.reactFlow).waitFor({ timeout: 15_000 })
    })

    test('clicking rules action node shows rules info in popover', async ({ page }) => {
      await clickNode(page, 'calculate_discount')
      await expect(page.locator(SEL.popover)).toBeVisible()
      await expect(page.locator(SEL.popover)).toContainText('discount.rules.yaml')
    })

    test('double-clicking rules action node opens tab editor with rules ref editor', async ({
      page,
    }) => {
      await dblClickNode(page, 'calculate_discount')
      await expect(page.locator(SEL.tabById('calculate_discount'))).toBeVisible()
      await expect(page.locator(SEL.rulesEditor)).toBeVisible()
    })

    test('tab editor shows rules file input with correct value', async ({ page }) => {
      await dblClickNode(page, 'calculate_discount')
      await expect(page.locator(SEL.rulesFileInput)).toBeVisible()
      await expect(page.locator(SEL.rulesFileInput)).toHaveValue('discount.rules.yaml')
    })

    test('tab editor shows evaluator selector', async ({ page }) => {
      await dblClickNode(page, 'calculate_discount')
      await expect(page.locator(SEL.rulesEvaluatorSelect)).toBeVisible()
      await expect(page.locator(SEL.rulesEvaluatorSelect)).toHaveValue('builtin')
    })
  })

  test.describe('Switch node with rules', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(EDITOR_URL('with-rules-switch'))
      await page.locator(SEL.reactFlow).waitFor({ timeout: 15_000 })
    })

    test('clicking rules switch node shows rules info in popover', async ({ page }) => {
      await clickNode(page, 'route_order')
      await expect(page.locator(SEL.popover)).toBeVisible()
      await expect(page.locator(SEL.popover)).toContainText('routing.rules.yaml')
    })

    test('double-clicking rules switch node opens tab editor with rules ref editor', async ({
      page,
    }) => {
      await dblClickNode(page, 'route_order')
      await expect(page.locator(SEL.tabById('route_order'))).toBeVisible()
      await expect(page.locator(SEL.rulesEditor)).toBeVisible()
    })

    test('tab editor shows rules file input for switch node', async ({ page }) => {
      await dblClickNode(page, 'route_order')
      await expect(page.locator(SEL.rulesFileInput)).toBeVisible()
      await expect(page.locator(SEL.rulesFileInput)).toHaveValue('routing.rules.yaml')
    })
  })
})
