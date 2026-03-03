import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { TopologyPreview } from './TopologyPreview'
import type { TemplateTopo } from '../data/templates'

afterEach(() => {
  cleanup()
})

const simpleTopo: TemplateTopo = {
  lanes: 2,
  nodes: [
    [0, 0, 'a'],
    [1, 1, 't'],
  ],
  edges: [[0, 1]],
}

describe('TopologyPreview', () => {
  it('renders an SVG element', () => {
    const { container } = render(
      <TopologyPreview topo={simpleTopo} width={320} height={120} isDark />,
    )
    const svg = container.querySelector('svg')
    expect(svg).toBeTruthy()
  })

  it('renders lane background rects matching lane count', () => {
    const { container } = render(
      <TopologyPreview topo={simpleTopo} width={320} height={120} isDark />,
    )
    // 2 lanes = 2 lane band rects (first children of svg)
    const rects = container.querySelectorAll('svg > rect')
    expect(rects.length).toBeGreaterThanOrEqual(2)
  })

  it('renders nodes as shapes', () => {
    const { container } = render(
      <TopologyPreview topo={simpleTopo} width={320} height={120} isDark />,
    )
    // At least 2 node shapes (rect for action, circle for terminal)
    const shapes = container.querySelectorAll('svg rect, svg circle')
    expect(shapes.length).toBeGreaterThanOrEqual(2)
  })
})
