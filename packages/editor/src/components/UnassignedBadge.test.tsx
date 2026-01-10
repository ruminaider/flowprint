import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { UnassignedBadge, isNodeUnassigned } from './UnassignedBadge'

describe('UnassignedBadge', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders nothing when visible=false', () => {
    const { container } = render(<UnassignedBadge visible={false} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders warning badge when visible=true', () => {
    const { container } = render(<UnassignedBadge visible={true} />)
    const svg = container.querySelector('svg')
    expect(svg).toBeTruthy()
  })

  it('has correct CSS class fp-unassigned-badge', () => {
    const { container } = render(<UnassignedBadge visible={true} />)
    expect(container.querySelector('.fp-unassigned-badge')).toBeTruthy()
  })
})

describe('isNodeUnassigned', () => {
  it('returns true for empty lane ID', () => {
    expect(isNodeUnassigned('', { lane1: {} })).toBe(true)
  })

  it('returns true for non-existent lane ID', () => {
    expect(isNodeUnassigned('missing', { lane1: {}, lane2: {} })).toBe(true)
  })

  it('returns false for valid lane ID', () => {
    expect(isNodeUnassigned('lane1', { lane1: {}, lane2: {} })).toBe(false)
  })
})
