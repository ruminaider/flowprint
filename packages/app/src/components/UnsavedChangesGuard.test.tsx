import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { UnsavedChangesGuard } from './UnsavedChangesGuard'

afterEach(() => {
  cleanup()
})

function dispatchBeforeUnload(): Event {
  const event = new Event('beforeunload', { cancelable: true })
  window.dispatchEvent(event)
  return event
}

describe('UnsavedChangesGuard', () => {
  it('registers beforeunload handler when dirty is true', () => {
    render(<UnsavedChangesGuard dirty={true} />)

    const event = dispatchBeforeUnload()

    expect(event.defaultPrevented).toBe(true)
  })

  it('does not register handler when dirty is false', () => {
    render(<UnsavedChangesGuard dirty={false} />)

    const event = dispatchBeforeUnload()

    expect(event.defaultPrevented).toBe(false)
  })

  it('removes handler on unmount', () => {
    const { unmount } = render(<UnsavedChangesGuard dirty={true} />)

    unmount()

    const event = dispatchBeforeUnload()

    expect(event.defaultPrevented).toBe(false)
  })

  it('adds handler when dirty transitions from false to true', () => {
    const { rerender } = render(<UnsavedChangesGuard dirty={false} />)

    rerender(<UnsavedChangesGuard dirty={true} />)

    const event = dispatchBeforeUnload()

    expect(event.defaultPrevented).toBe(true)
  })

  it('removes handler when dirty transitions from true to false', () => {
    const { rerender } = render(<UnsavedChangesGuard dirty={true} />)

    rerender(<UnsavedChangesGuard dirty={false} />)

    const event = dispatchBeforeUnload()

    expect(event.defaultPrevented).toBe(false)
  })
})
