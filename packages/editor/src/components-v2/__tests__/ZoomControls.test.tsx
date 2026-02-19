import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'

// Mock @xyflow/react hooks
const mockZoomIn = vi.fn()
const mockZoomOut = vi.fn()
const mockFitView = vi.fn()
const mockGetZoom = vi.fn(() => 1)
const mockSetViewport = vi.fn()
const mockGetViewport = vi.fn(() => ({ x: 0, y: 0, zoom: 1 }))

vi.mock('@xyflow/react', () => ({
  useReactFlow: () => ({
    zoomIn: mockZoomIn,
    zoomOut: mockZoomOut,
    fitView: mockFitView,
    getZoom: mockGetZoom,
    setViewport: mockSetViewport,
    getViewport: mockGetViewport,
  }),
  useOnViewportChange: vi.fn(),
}))

import { ZoomControls } from '../ZoomControls'

describe('ZoomControls', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetZoom.mockReturnValue(1)
    mockGetViewport.mockReturnValue({ x: 0, y: 0, zoom: 1 })
  })

  it('renders zoom buttons', () => {
    render(<ZoomControls />)

    expect(screen.getByLabelText('Zoom in')).toBeTruthy()
    expect(screen.getByLabelText('Zoom out')).toBeTruthy()
    expect(screen.getByLabelText('Fit to view')).toBeTruthy()
  })

  it('displays zoom percentage', () => {
    render(<ZoomControls />)

    expect(screen.getByLabelText('Zoom percentage').textContent).toBe('100%')
  })

  it('calls zoomIn() when zoom in button is clicked', () => {
    render(<ZoomControls />)

    fireEvent.click(screen.getByLabelText('Zoom in'))
    expect(mockZoomIn).toHaveBeenCalledOnce()
  })

  it('calls zoomOut() when zoom out button is clicked', () => {
    render(<ZoomControls />)

    fireEvent.click(screen.getByLabelText('Zoom out'))
    expect(mockZoomOut).toHaveBeenCalledOnce()
  })

  it('calls fitView({ padding: 0.1 }) when fit button is clicked', () => {
    render(<ZoomControls />)

    fireEvent.click(screen.getByLabelText('Fit to view'))
    expect(mockFitView).toHaveBeenCalledWith({ padding: 0.1 })
  })

  it('wraps content in Island with fp-zoom-controls class', () => {
    const { container } = render(<ZoomControls />)

    const island = container.querySelector('.fp-island.fp-zoom-controls')
    expect(island).toBeTruthy()
  })

  it('enters edit mode when percentage is clicked', () => {
    render(<ZoomControls />)

    fireEvent.click(screen.getByLabelText('Zoom percentage'))

    const input = screen.getByLabelText('Zoom percentage') as HTMLInputElement
    expect(input.tagName).toBe('INPUT')
    expect(input.type).toBe('number')
    expect(input.value).toBe('100')
  })

  it('applies zoom on Enter in edit mode', () => {
    render(<ZoomControls />)

    fireEvent.click(screen.getByLabelText('Zoom percentage'))

    const input = screen.getByLabelText('Zoom percentage') as HTMLInputElement
    fireEvent.change(input, { target: { value: '150' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(mockSetViewport).toHaveBeenCalledWith({ x: 0, y: 0, zoom: 1.5 })
  })

  it('cancels edit on Escape without applying zoom', () => {
    render(<ZoomControls />)

    fireEvent.click(screen.getByLabelText('Zoom percentage'))

    const input = screen.getByLabelText('Zoom percentage') as HTMLInputElement
    fireEvent.change(input, { target: { value: '200' } })
    fireEvent.keyDown(input, { key: 'Escape' })

    expect(mockSetViewport).not.toHaveBeenCalled()
    // Should return to display mode
    expect(screen.getByLabelText('Zoom percentage').tagName).toBe('BUTTON')
  })

  it('applies zoom on blur', () => {
    render(<ZoomControls />)

    fireEvent.click(screen.getByLabelText('Zoom percentage'))

    const input = screen.getByLabelText('Zoom percentage') as HTMLInputElement
    fireEvent.change(input, { target: { value: '75' } })
    fireEvent.blur(input)

    expect(mockSetViewport).toHaveBeenCalledWith({ x: 0, y: 0, zoom: 0.75 })
  })

  it('does not apply invalid zoom values', () => {
    render(<ZoomControls />)

    fireEvent.click(screen.getByLabelText('Zoom percentage'))

    const input = screen.getByLabelText('Zoom percentage') as HTMLInputElement
    fireEvent.change(input, { target: { value: '5' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(mockSetViewport).not.toHaveBeenCalled()
  })

  it('displays correct zoom for non-100% zoom levels', () => {
    mockGetZoom.mockReturnValue(0.75)

    render(<ZoomControls />)

    expect(screen.getByLabelText('Zoom percentage').textContent).toBe('75%')
  })
})
