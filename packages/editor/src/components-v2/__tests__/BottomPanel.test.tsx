import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { BottomPanel } from '../BottomPanel'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  yamlContent: 'schema: flowprint/1.0\nname: test',
  validationErrors: [
    { message: 'Missing required field', path: '/nodes/0/label' },
    { message: 'Invalid node type' },
  ],
}

function renderPanel(overrides?: Partial<React.ComponentProps<typeof BottomPanel>>) {
  const props = { ...defaultProps, ...overrides, onClose: overrides?.onClose ?? vi.fn() }
  return { ...render(<BottomPanel {...props} />), props }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BottomPanel', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('renders nothing when isOpen is false', () => {
    const { container } = renderPanel({ isOpen: false })
    expect(container.innerHTML).toBe('')
  })

  it('renders YAML content when open with yaml tab active', () => {
    const { container } = renderPanel()
    const pre = container.querySelector('.fp-bottom-panel__yaml')
    expect(pre).toBeTruthy()
    expect(pre?.textContent).toBe('schema: flowprint/1.0\nname: test')
  })

  it('defaults to yaml tab', () => {
    renderPanel()

    const yamlTab = screen.getByRole('button', { name: 'YAML' })
    expect(yamlTab.classList.contains('fp-bottom-panel__tab--active')).toBe(true)

    const validationTab = screen.getByRole('button', { name: 'Validation' })
    expect(validationTab.classList.contains('fp-bottom-panel__tab--active')).toBe(false)
  })

  it('renders validation errors when validation tab is clicked', () => {
    renderPanel()

    fireEvent.click(screen.getByRole('button', { name: 'Validation' }))

    expect(screen.getByText('Missing required field')).toBeTruthy()
    expect(screen.getByText('/nodes/0/label')).toBeTruthy()
    expect(screen.getByText('Invalid node type')).toBeTruthy()
  })

  it('close button fires onClose callback', () => {
    const onClose = vi.fn()
    renderPanel({ onClose })

    fireEvent.click(screen.getByLabelText('Close panel'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('tab switching works', () => {
    const { container } = renderPanel()

    // Start on yaml tab
    const pre = container.querySelector('.fp-bottom-panel__yaml')
    expect(pre).toBeTruthy()
    expect(pre?.textContent).toBe(defaultProps.yamlContent)

    // Switch to validation
    fireEvent.click(screen.getByRole('button', { name: 'Validation' }))
    expect(screen.getByText('Missing required field')).toBeTruthy()
    expect(container.querySelector('.fp-bottom-panel__yaml')).toBeNull()

    // Switch back to yaml
    fireEvent.click(screen.getByRole('button', { name: 'YAML' }))
    const preAgain = container.querySelector('.fp-bottom-panel__yaml')
    expect(preAgain).toBeTruthy()
    expect(preAgain?.textContent).toBe(defaultProps.yamlContent)
  })
})
