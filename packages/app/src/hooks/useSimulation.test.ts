import { renderHook, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useSimulation } from './useSimulation'
import type { FlowprintDocument } from '@ruminaider/flowprint-schema'
import type { RulesDataMap } from '@ruminaider/flowprint-editor'

// Mock the engine browser module
vi.mock('@ruminaider/flowprint-engine/browser', () => ({
  simulateGraph: vi.fn(),
}))

// Import the mock after vi.mock
const { simulateGraph } = await import('@ruminaider/flowprint-engine/browser')
const mockSimulateGraph = vi.mocked(simulateGraph)

const minimalDoc: FlowprintDocument = {
  schema: 'flowprint/1.0',
  name: 'test',
  version: '0.1.0',
  lanes: {},
  nodes: {
    start: { type: 'action', lane: 'main', label: 'Start', next: 'end' },
    end: { type: 'terminal', lane: 'main', label: 'End', outcome: 'success' },
  },
}

const emptyRules: RulesDataMap = {}

const mockTrace = {
  status: 'success' as const,
  duration_ms: 10,
  steps: [
    { node_id: 'start', type: 'action', status: 'completed', next: 'end' },
    { node_id: 'end', type: 'terminal', status: 'reached', outcome: 'success' },
  ],
}

const threeStepTrace = {
  status: 'success' as const,
  duration_ms: 15,
  steps: [
    {
      node_id: 'a',
      type: 'action',
      status: 'completed',
      next: 'b',
      stepOutput: { nodeId: 'a', value: 1 },
    },
    { node_id: 'b', type: 'action', status: 'completed', next: 'c' },
    { node_id: 'c', type: 'terminal', status: 'reached', outcome: 'success' },
  ],
}

describe('useSimulation', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockSimulateGraph.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns inactive initial state', () => {
    const { result } = renderHook(() => useSimulation(minimalDoc, emptyRules))
    expect(result.current.isActive).toBe(false)
    expect(result.current.trace).toBeNull()
    expect(result.current.currentStep).toBe(0)
    expect(result.current.totalSteps).toBe(0)
    expect(result.current.error).toBeNull()
    expect(result.current.nodeHighlights).toEqual({})
  })

  it('start() runs simulation and stores trace', async () => {
    mockSimulateGraph.mockResolvedValue(mockTrace)

    const { result } = renderHook(() => useSimulation(minimalDoc, emptyRules))

    await act(async () => {
      result.current.start({ test: true })
      // Flush the resolved promise
      await vi.runAllTimersAsync()
    })

    expect(mockSimulateGraph).toHaveBeenCalledOnce()
    expect(result.current.isActive).toBe(true)
    expect(result.current.trace).toBe(mockTrace)
    expect(result.current.totalSteps).toBe(2)
    expect(result.current.currentStep).toBe(0)
  })

  it('start() sets error on rejection', async () => {
    mockSimulateGraph.mockRejectedValue(new Error('sim failed'))

    const { result } = renderHook(() => useSimulation(minimalDoc, emptyRules))

    await act(async () => {
      result.current.start({})
      await vi.runAllTimersAsync()
    })

    expect(result.current.error).toBe('sim failed')
    expect(result.current.isActive).toBe(false)
  })

  it('error is cleared on subsequent start()', async () => {
    mockSimulateGraph.mockRejectedValueOnce(new Error('first fail'))

    const { result } = renderHook(() => useSimulation(minimalDoc, emptyRules))

    await act(async () => {
      result.current.start({})
      await vi.runAllTimersAsync()
    })
    expect(result.current.error).toBe('first fail')

    mockSimulateGraph.mockResolvedValue(mockTrace)
    await act(async () => {
      result.current.start({})
      await vi.runAllTimersAsync()
    })
    expect(result.current.error).toBeNull()
    expect(result.current.isActive).toBe(true)
  })

  it('error is cleared on stop()', async () => {
    mockSimulateGraph.mockRejectedValue(new Error('fail'))

    const { result } = renderHook(() => useSimulation(minimalDoc, emptyRules))

    await act(async () => {
      result.current.start({})
      await vi.runAllTimersAsync()
    })
    expect(result.current.error).toBe('fail')

    act(() => {
      result.current.stop()
    })
    expect(result.current.error).toBeNull()
  })

  it('stepForward() increments currentStep and clamps at max', async () => {
    mockSimulateGraph.mockResolvedValue(mockTrace)
    const { result } = renderHook(() => useSimulation(minimalDoc, emptyRules))

    await act(async () => {
      result.current.start({})
      await vi.runAllTimersAsync()
    })

    act(() => {
      result.current.stepForward()
    })
    expect(result.current.currentStep).toBe(1)

    // Clamps at max (totalSteps - 1 = 1)
    act(() => {
      result.current.stepForward()
    })
    expect(result.current.currentStep).toBe(1)
  })

  it('stepBack() decrements and clamps at 0', async () => {
    mockSimulateGraph.mockResolvedValue(threeStepTrace)
    const { result } = renderHook(() => useSimulation(minimalDoc, emptyRules))

    await act(async () => {
      result.current.start({})
      await vi.runAllTimersAsync()
    })

    act(() => {
      result.current.stepForward()
      result.current.stepForward()
    })
    expect(result.current.currentStep).toBe(2)

    act(() => {
      result.current.stepBack()
    })
    expect(result.current.currentStep).toBe(1)

    act(() => {
      result.current.stepBack()
    })
    expect(result.current.currentStep).toBe(0)

    // Clamps at 0
    act(() => {
      result.current.stepBack()
    })
    expect(result.current.currentStep).toBe(0)
  })

  it('goToStep() jumps to specific step', async () => {
    mockSimulateGraph.mockResolvedValue(threeStepTrace)
    const { result } = renderHook(() => useSimulation(minimalDoc, emptyRules))

    await act(async () => {
      result.current.start({})
      await vi.runAllTimersAsync()
    })

    act(() => {
      result.current.goToStep(2)
    })
    expect(result.current.currentStep).toBe(2)

    act(() => {
      result.current.goToStep(0)
    })
    expect(result.current.currentStep).toBe(0)

    // Clamps out-of-range
    act(() => {
      result.current.goToStep(100)
    })
    expect(result.current.currentStep).toBe(2)
  })

  it('nodeHighlights computed correctly at each step', async () => {
    mockSimulateGraph.mockResolvedValue(threeStepTrace)
    const { result } = renderHook(() => useSimulation(minimalDoc, emptyRules))

    await act(async () => {
      result.current.start({})
      await vi.runAllTimersAsync()
    })

    // Step 0: a is active
    expect(result.current.nodeHighlights).toEqual({ a: 'active' })

    // Step 1: a is visited, b is active
    act(() => {
      result.current.stepForward()
    })
    expect(result.current.nodeHighlights).toEqual({ a: 'visited', b: 'active' })

    // Step 2: a and b visited, c is active
    act(() => {
      result.current.stepForward()
    })
    expect(result.current.nodeHighlights).toEqual({
      a: 'visited',
      b: 'visited',
      c: 'active',
    })
  })

  it('stop() clears all state', async () => {
    mockSimulateGraph.mockResolvedValue(mockTrace)
    const { result } = renderHook(() => useSimulation(minimalDoc, emptyRules))

    await act(async () => {
      result.current.start({})
      await vi.runAllTimersAsync()
    })
    expect(result.current.isActive).toBe(true)

    act(() => {
      result.current.stop()
    })
    expect(result.current.isActive).toBe(false)
    expect(result.current.trace).toBeNull()
    expect(result.current.currentStep).toBe(0)
    expect(result.current.isAutoPlaying).toBe(false)
  })

  it('reset() returns to step 0', async () => {
    mockSimulateGraph.mockResolvedValue(threeStepTrace)
    const { result } = renderHook(() => useSimulation(minimalDoc, emptyRules))

    await act(async () => {
      result.current.start({})
      await vi.runAllTimersAsync()
    })

    act(() => {
      result.current.stepForward()
      result.current.stepForward()
    })
    expect(result.current.currentStep).toBe(2)

    act(() => {
      result.current.reset()
    })
    expect(result.current.currentStep).toBe(0)
    expect(result.current.isAutoPlaying).toBe(false)
  })

  it('auto-play advances on timer tick', async () => {
    mockSimulateGraph.mockResolvedValue(threeStepTrace)
    const { result } = renderHook(() => useSimulation(minimalDoc, emptyRules))

    await act(async () => {
      result.current.start({})
      await vi.runAllTimersAsync()
    })

    act(() => {
      result.current.setAutoPlay(true)
    })
    expect(result.current.isAutoPlaying).toBe(true)
    expect(result.current.currentStep).toBe(0)

    // Advance one tick
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500)
    })
    expect(result.current.currentStep).toBe(1)

    // Advance another tick
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500)
    })
    expect(result.current.currentStep).toBe(2)
  })

  it('auto-play stops at end', async () => {
    mockSimulateGraph.mockResolvedValue(mockTrace) // 2 steps
    const { result } = renderHook(() => useSimulation(minimalDoc, emptyRules))

    await act(async () => {
      result.current.start({})
      await vi.runAllTimersAsync()
    })

    act(() => {
      result.current.setAutoPlay(true)
    })

    // First tick: step 0 → 1 (last step)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500)
    })
    expect(result.current.currentStep).toBe(1)

    // Second tick: should stop
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500)
    })
    expect(result.current.currentStep).toBe(1)
    expect(result.current.isAutoPlaying).toBe(false)
  })

  it('does not start when doc is null', async () => {
    const { result } = renderHook(() => useSimulation(null, emptyRules))

    await act(async () => {
      result.current.start({})
      await vi.runAllTimersAsync()
    })

    expect(mockSimulateGraph).not.toHaveBeenCalled()
    expect(result.current.isActive).toBe(false)
  })
})
