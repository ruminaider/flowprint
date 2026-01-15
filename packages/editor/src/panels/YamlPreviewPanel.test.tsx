import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import type { FlowprintDocument } from '@ruminaider/flowprint-schema'
import { YamlPreviewPanel } from './YamlPreviewPanel'

vi.mock('@ruminaider/flowprint-schema', () => ({
  serialize: vi.fn((doc: FlowprintDocument) => `schema: ${doc.schema}\nname: ${doc.name}\n`),
}))

// Monaco is not available in test environment — the dynamic import will fail,
// which triggers the fallback <pre> rendering. No need to mock it.

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
  afterEach(() => {
    cleanup()
  })

  it('returns null when not visible', () => {
    const { container } = render(
      <YamlPreviewPanel doc={baseDoc} visible={false} />,
    )

    expect(container.innerHTML).toBe('')
  })

  it('shows header when visible', async () => {
    render(<YamlPreviewPanel doc={baseDoc} visible={true} />)

    expect(screen.getByText('YAML Preview')).toBeTruthy()
  })

  it('shows YAML content in fallback pre element', async () => {
    render(<YamlPreviewPanel doc={baseDoc} visible={true} />)

    // Wait for Monaco probe to fail and fallback to render
    const pre = await screen.findByText(/schema: flowprint\/1\.0/, {}, { timeout: 3000 })
    expect(pre).toBeTruthy()
    expect(pre.tagName).toBe('PRE')
    expect(pre.className).toBe('fp-yaml-preview-fallback')
  })

  it('updates when doc changes', async () => {
    const { rerender } = render(
      <YamlPreviewPanel doc={baseDoc} visible={true} />,
    )

    // Wait for fallback to appear
    await screen.findByText(/schema: flowprint\/1\.0/, {}, { timeout: 3000 })

    const updatedDoc: FlowprintDocument = {
      ...baseDoc,
      name: 'updated-blueprint',
    }

    rerender(<YamlPreviewPanel doc={updatedDoc} visible={true} />)

    const pre = await screen.findByText(/name: updated-blueprint/, {}, { timeout: 3000 })
    expect(pre).toBeTruthy()
  })

  it('uses serialize to produce YAML text', async () => {
    const { serialize } = await import('@ruminaider/flowprint-schema')

    render(<YamlPreviewPanel doc={baseDoc} visible={true} />)

    expect(serialize).toHaveBeenCalledWith(baseDoc)
  })

  it('applies correct CSS classes', async () => {
    const { container } = render(
      <YamlPreviewPanel doc={baseDoc} visible={true} />,
    )

    expect(container.querySelector('.fp-yaml-preview')).toBeTruthy()
    expect(container.querySelector('.fp-yaml-preview-header')).toBeTruthy()
    expect(container.querySelector('.fp-yaml-preview-content')).toBeTruthy()
  })
})
