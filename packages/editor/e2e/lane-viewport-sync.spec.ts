import { test, expect } from '@playwright/test'
import { SEL, EDITOR_URL } from './selectors'

test.describe('Lane viewport sync', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(EDITOR_URL('with-nodes'))
    await page.locator(SEL.reactFlow).waitFor({ timeout: 15_000 })
  })

  test('lanes are descendants of .react-flow__viewport', async ({ page }) => {
    const viewport = page.locator('.react-flow__viewport')
    const lanes = viewport.locator(SEL.lane)
    await expect(lanes.first()).toBeAttached()
  })

  test('zoom in scales lanes proportionally with nodes', async ({ page }) => {
    const lane = page.locator(SEL.lane).first()
    const node = page.locator('.react-flow__node').first()

    const laneBefore = (await lane.boundingBox())!
    const nodeBefore = (await node.boundingBox())!

    await page.getByRole('button', { name: 'Zoom in' }).click()
    await page.getByRole('button', { name: 'Zoom in' }).click()

    const laneAfter = (await lane.boundingBox())!
    const nodeAfter = (await node.boundingBox())!

    const laneScale = laneAfter.width / laneBefore.width
    const nodeScale = nodeAfter.width / nodeBefore.width

    expect(laneScale).toBeGreaterThan(1)
    expect(laneScale).toBeCloseTo(nodeScale, 1)
  })

  test('zoom out shrinks lanes proportionally with nodes', async ({ page }) => {
    const lane = page.locator(SEL.lane).first()
    const node = page.locator('.react-flow__node').first()

    const laneBefore = (await lane.boundingBox())!
    const nodeBefore = (await node.boundingBox())!

    await page.getByRole('button', { name: 'Zoom out' }).click()
    await page.getByRole('button', { name: 'Zoom out' }).click()

    const laneAfter = (await lane.boundingBox())!
    const nodeAfter = (await node.boundingBox())!

    const laneScale = laneAfter.width / laneBefore.width
    const nodeScale = nodeAfter.width / nodeBefore.width

    expect(laneScale).toBeLessThan(1)
    expect(laneScale).toBeCloseTo(nodeScale, 1)
  })

  test('pan moves lanes and nodes by the same amount', async ({ page }) => {
    const lane = page.locator(SEL.lane).first()
    const node = page.locator('.react-flow__node').first()

    const laneBefore = (await lane.boundingBox())!
    const nodeBefore = (await node.boundingBox())!

    // Pan by dragging on the canvas background
    const canvas = page.locator(SEL.reactFlow)
    const box = (await canvas.boundingBox())!
    const startX = box.x + box.width / 2
    const startY = box.y + box.height / 2

    await page.mouse.move(startX, startY)
    await page.mouse.down()
    await page.mouse.move(startX + 150, startY + 100, { steps: 5 })
    await page.mouse.up()

    const laneAfter = (await lane.boundingBox())!
    const nodeAfter = (await node.boundingBox())!

    const laneDx = laneAfter.x - laneBefore.x
    const nodeDx = nodeAfter.x - nodeBefore.x
    const laneDy = laneAfter.y - laneBefore.y
    const nodeDy = nodeAfter.y - nodeBefore.y

    expect(laneDx).toBeCloseTo(nodeDx, 0)
    expect(laneDy).toBeCloseTo(nodeDy, 0)
  })

  test('fit-to-view keeps nodes within their lanes', async ({ page }) => {
    // Zoom in to disturb the view, then fit
    await page.getByRole('button', { name: 'Zoom in' }).click()
    await page.getByRole('button', { name: 'Zoom in' }).click()
    await page.getByRole('button', { name: 'Fit to view' }).click()

    // After fit-to-view, every node should overlap its lane
    const lanes = await page.locator(SEL.lane).all()
    const nodes = await page.locator('.react-flow__node').all()

    expect(lanes.length).toBeGreaterThan(0)
    expect(nodes.length).toBeGreaterThan(0)

    for (const node of nodes) {
      const nodeBox = (await node.boundingBox())!
      const nodeCenterY = nodeBox.y + nodeBox.height / 2

      // At least one lane should contain the node's vertical center
      let containedByLane = false
      for (const lane of lanes) {
        const laneBox = (await lane.boundingBox())!
        if (nodeCenterY >= laneBox.y && nodeCenterY <= laneBox.y + laneBox.height) {
          containedByLane = true
          break
        }
      }
      expect(containedByLane).toBe(true)
    }
  })
})
