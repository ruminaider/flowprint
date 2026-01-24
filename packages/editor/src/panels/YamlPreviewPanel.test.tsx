import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, cleanup, act } from '@testing-library/react'
import type { FlowprintDocument } from '@ruminaider/flowprint-schema'
import { YamlPreviewPanel } from './YamlPreviewPanel'

vi.mock('@ruminaider/flowprint-schema', () => ({
  serialize: vi.fn((doc: FlowprintDocument) => `schema: ${doc.schema}\nname: ${doc.name}\n`),
}))

const baseDoc: FlowprintDocument = {
  schema: 'flowprint/1.0',
  name: 'test-blueprint',
  version: '1.0.0',
  lanes: {
    customer: { label: 'Customer', visibility: 'external', order: 0 },
  },
  nodes: {
    start: {
      type: 'action',
      lane: 'customer',
      label: 'Start',
      next: 'end',
    },
  },
}

describe('YamlPreviewPanel', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('returns null when not visible', () => {
    const { container } = render(<YamlPreviewPanel doc={baseDoc} visible={false} />)

    expect(container.innerHTML).toBe('')
  })

  it('shows header when visible', () => {
    render(<YamlPreviewPanel doc={baseDoc} visible={true} />)

    expect(screen.getByText('YAML Preview')).toBeTruthy()
  })

  it('shows YAML content in fallback pre element', () => {
    render(<YamlPreviewPanel doc={baseDoc} visible={true} />)

    // Advance past the 2s Monaco probe timeout so the component falls back to <pre>
    act(() => {
      vi.advanceTimersByTime(2500)
    })

    const pre = screen.getByText(/schema: flowprint\/1\.0/)
    expect(pre).toBeTruthy()
    expect(pre.tagName).toBe('PRE')
    expect(pre.className).toBe('fp-yaml-preview-fallback')
  })

  it('updates when doc changes', () => {
    const { rerender } = render(<YamlPreviewPanel doc={baseDoc} visible={true} />)

    // Advance past Monaco probe timeout
    act(() => {
      vi.advanceTimersByTime(2500)
    })

    expect(screen.getByText(/schema: flowprint\/1\.0/)).toBeTruthy()

    const updatedDoc: FlowprintDocument = {
      ...baseDoc,
      name: 'updated-blueprint',
    }

    rerender(<YamlPreviewPanel doc={updatedDoc} visible={true} />)

    const pre = screen.getByText(/name: updated-blueprint/)
    expect(pre).toBeTruthy()
  })

  it('uses serialize to produce YAML text', async () => {
    const { serialize } = await import('@ruminaider/flowprint-schema')

    render(<YamlPreviewPanel doc={baseDoc} visible={true} />)

    expect(serialize).toHaveBeenCalledWith(baseDoc)
  })

  it('applies correct CSS classes', () => {
    const { container } = render(<YamlPreviewPanel doc={baseDoc} visible={true} />)

    expect(container.querySelector('.fp-yaml-preview')).toBeTruthy()
    expect(container.querySelector('.fp-yaml-preview-header')).toBeTruthy()
    expect(container.querySelector('.fp-yaml-preview-content')).toBeTruthy()
  })
})
