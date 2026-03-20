import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { SimulationPanel } from './SimulationPanel'
import type { UseSimulationReturn } from '../hooks/useSimulation'

afterEach(() => {
  cleanup()
})

function createMockSimulation(
  overrides: Partial<UseSimulationReturn> = {},
): UseSimulationReturn {
  return {
    isActive: false,
    trace: null,
    currentStep: 0,
    totalSteps: 0,
    currentNodeId: undefined,
    currentStepData: undefined,
    nodeHighlights: {},
    error: null,
    start: vi.fn(),
    stop: vi.fn(),
    stepForward: vi.fn(),
    stepBack: vi.fn(),
    goToStep: vi.fn(),
    reset: vi.fn(),
    setAutoPlay: vi.fn(),
    isAutoPlaying: false,
    ...overrides,
  }
}

const mockTrace = {
  status: 'success' as const,
  steps: [
    {
      node_id: 'start',
      type: 'action' as const,
      status: 'completed' as const,
      next: 'end',
      stepOutput: { nodeId: 'start', value: { foo: 1 } },
    },
    {
      node_id: 'end',
      type: 'terminal' as const,
      status: 'reached' as const,
      outcome: 'success',
    },
  ],
}

describe('SimulationPanel', () => {
  describe('256KB input size limit', () => {
    it('shows error and does not call start() when input exceeds 256KB', () => {
      const sim = createMockSimulation()
      render(<SimulationPanel simulation={sim} />)

      // Create a string larger than 256KB (256 * 1024 + 1 bytes)
      const oversizedInput = '"' + 'a'.repeat(256 * 1024) + '"'

      fireEvent.change(screen.getByPlaceholderText('{"key": "value"}'), {
        target: { value: oversizedInput },
      })

      fireEvent.click(screen.getByText('Run'))

      expect(screen.getByText('Input exceeds 256KB limit')).toBeTruthy()
      expect(sim.start).not.toHaveBeenCalled()
    })
  })

  describe('invalid JSON input', () => {
    it('shows error and does not call start() for malformed JSON', () => {
      const sim = createMockSimulation()
      render(<SimulationPanel simulation={sim} />)

      fireEvent.change(screen.getByPlaceholderText('{"key": "value"}'), {
        target: { value: '{not valid json' },
      })

      fireEvent.click(screen.getByText('Run'))

      expect(screen.getByText('Invalid JSON input')).toBeTruthy()
      expect(sim.start).not.toHaveBeenCalled()
    })
  })

  describe('invalid fixtures JSON', () => {
    it('shows error when fixtures JSON is invalid', () => {
      const sim = createMockSimulation()
      render(<SimulationPanel simulation={sim} />)

      // Valid input JSON (default is {})
      // Show fixtures
      fireEvent.click(screen.getByText('Show Fixtures'))

      // Enter invalid fixtures JSON
      fireEvent.change(
        screen.getByPlaceholderText('{"wait_node_id": {"event": "data"}}'),
        { target: { value: '{bad fixtures' } },
      )

      fireEvent.click(screen.getByText('Run'))

      expect(screen.getByText('Invalid JSON fixtures')).toBeTruthy()
      expect(sim.start).not.toHaveBeenCalled()
    })
  })

  describe('keyboard navigation', () => {
    it('ArrowRight calls stepForward when simulation is active', () => {
      const sim = createMockSimulation({
        isActive: true,
        trace: mockTrace,
        totalSteps: 2,
        currentStep: 0,
        currentNodeId: 'start',
        currentStepData: mockTrace.steps[0],
      })
      render(<SimulationPanel simulation={sim} />)

      fireEvent.keyDown(window, { key: 'ArrowRight' })

      expect(sim.stepForward).toHaveBeenCalledOnce()
    })

    it('ArrowLeft calls stepBack when simulation is active', () => {
      const sim = createMockSimulation({
        isActive: true,
        trace: mockTrace,
        totalSteps: 2,
        currentStep: 1,
        currentNodeId: 'end',
        currentStepData: mockTrace.steps[1],
      })
      render(<SimulationPanel simulation={sim} />)

      fireEvent.keyDown(window, { key: 'ArrowLeft' })

      expect(sim.stepBack).toHaveBeenCalledOnce()
    })

    it('Space toggles auto-play when simulation is active', () => {
      const sim = createMockSimulation({
        isActive: true,
        trace: mockTrace,
        totalSteps: 2,
        currentStep: 0,
        currentNodeId: 'start',
        currentStepData: mockTrace.steps[0],
        isAutoPlaying: false,
      })
      render(<SimulationPanel simulation={sim} />)

      fireEvent.keyDown(window, { key: ' ' })

      expect(sim.setAutoPlay).toHaveBeenCalledWith(true)
    })

    it('Space pauses auto-play when already playing', () => {
      const sim = createMockSimulation({
        isActive: true,
        trace: mockTrace,
        totalSteps: 2,
        currentStep: 0,
        currentNodeId: 'start',
        currentStepData: mockTrace.steps[0],
        isAutoPlaying: true,
      })
      render(<SimulationPanel simulation={sim} />)

      fireEvent.keyDown(window, { key: ' ' })

      expect(sim.setAutoPlay).toHaveBeenCalledWith(false)
    })
  })

  describe('show/hide fixtures toggle', () => {
    it('clicking Show Fixtures reveals the fixtures textarea', () => {
      const sim = createMockSimulation()
      render(<SimulationPanel simulation={sim} />)

      // Fixtures textarea should not be visible initially
      expect(
        screen.queryByPlaceholderText('{"wait_node_id": {"event": "data"}}'),
      ).toBeNull()

      fireEvent.click(screen.getByText('Show Fixtures'))

      // Now it should be visible
      expect(
        screen.getByPlaceholderText('{"wait_node_id": {"event": "data"}}'),
      ).toBeTruthy()
    })

    it('clicking Hide Fixtures hides the fixtures textarea', () => {
      const sim = createMockSimulation()
      render(<SimulationPanel simulation={sim} />)

      // Show then hide
      fireEvent.click(screen.getByText('Show Fixtures'))
      expect(
        screen.getByPlaceholderText('{"wait_node_id": {"event": "data"}}'),
      ).toBeTruthy()

      fireEvent.click(screen.getByText('Hide Fixtures'))
      expect(
        screen.queryByPlaceholderText('{"wait_node_id": {"event": "data"}}'),
      ).toBeNull()
    })
  })

  describe('show/hide context viewer toggle', () => {
    it('clicking Show Context reveals the context JSON viewer', () => {
      const sim = createMockSimulation({
        isActive: true,
        trace: mockTrace,
        totalSteps: 2,
        currentStep: 0,
        currentNodeId: 'start',
        currentStepData: mockTrace.steps[0],
      })
      render(<SimulationPanel simulation={sim} />)

      // The button text includes entry count
      const contextButton = screen.getByText(/Show Context/)
      fireEvent.click(contextButton)

      // After clicking, context JSON should be visible
      // The cumulative context at step 0 includes stepOutput from start node
      expect(screen.getByText(/Hide Context/)).toBeTruthy()
    })

    it('hides context viewer when toggled off', () => {
      const sim = createMockSimulation({
        isActive: true,
        trace: mockTrace,
        totalSteps: 2,
        currentStep: 0,
        currentNodeId: 'start',
        currentStepData: mockTrace.steps[0],
      })
      render(<SimulationPanel simulation={sim} />)

      // Show then hide
      fireEvent.click(screen.getByText(/Show Context/))
      expect(screen.getByText(/Hide Context/)).toBeTruthy()

      fireEvent.click(screen.getByText(/Hide Context/))
      expect(screen.getByText(/Show Context/)).toBeTruthy()
    })
  })

  describe('scrubber interaction', () => {
    it('changing the range input calls goToStep with the new value', () => {
      const sim = createMockSimulation({
        isActive: true,
        trace: mockTrace,
        totalSteps: 2,
        currentStep: 0,
        currentNodeId: 'start',
        currentStepData: mockTrace.steps[0],
      })
      render(<SimulationPanel simulation={sim} />)

      const scrubber = screen.getByRole('slider')

      fireEvent.change(scrubber, { target: { value: '1' } })

      expect(sim.goToStep).toHaveBeenCalledWith(1)
    })

    it('scrubber pauses auto-play before jumping', () => {
      const sim = createMockSimulation({
        isActive: true,
        trace: mockTrace,
        totalSteps: 2,
        currentStep: 0,
        currentNodeId: 'start',
        currentStepData: mockTrace.steps[0],
        isAutoPlaying: true,
      })
      render(<SimulationPanel simulation={sim} />)

      const scrubber = screen.getByRole('slider')

      fireEvent.change(scrubber, { target: { value: '1' } })

      expect(sim.setAutoPlay).toHaveBeenCalledWith(false)
      expect(sim.goToStep).toHaveBeenCalledWith(1)
    })
  })
})
