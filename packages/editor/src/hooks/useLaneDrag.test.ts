import { describe, it, expect } from 'vitest'
import { detectLane } from './useLaneDrag'
import type { LaneBand } from '../layout/types'

function makeLane(
  overrides: Partial<LaneBand> & { laneId: string; y: number; height: number },
): LaneBand {
  return {
    label: overrides.laneId,
    visibility: 'external',
    order: 0,
    color: '#e0f2fe',
    borderColor: '#38bdf8',
    ...overrides,
  }
}

const twoLanes: LaneBand[] = [
  makeLane({ laneId: 'top', y: 0, height: 140, order: 0 }),
  makeLane({ laneId: 'bottom', y: 140, height: 140, order: 1, visibility: 'internal' }),
]

describe('detectLane', () => {
  it('returns lane when node center is inside a lane band', () => {
    // Node at y=20, height=80 -> center = 60, which is in top lane [0, 140)
    const result = detectLane(20, 80, twoLanes)
    expect(result).toBe('top')
  })

  it('returns bottom lane when node center is in bottom band', () => {
    // Node at y=160, height=80 -> center = 200, which is in bottom lane [140, 280)
    const result = detectLane(160, 80, twoLanes)
    expect(result).toBe('bottom')
  })

  it('returns null when node center is above all lanes', () => {
    const result = detectLane(-100, 80, twoLanes)
    expect(result).toBeNull()
  })

  it('returns null when node center is below all lanes', () => {
    // Bottom lane ends at 280. Node at y=300, height=80 -> center = 340
    const result = detectLane(300, 80, twoLanes)
    expect(result).toBeNull()
  })

  it('returns null for empty lanes', () => {
    const result = detectLane(50, 80, [])
    expect(result).toBeNull()
  })

  it('returns correct lane at boundary (center exactly at lane top)', () => {
    // Node at y=100, height=80 -> center = 140, which is bottom lane [140, 280)
    const result = detectLane(100, 80, twoLanes)
    expect(result).toBe('bottom')
  })

  it('returns correct lane just before boundary', () => {
    // Node at y=99, height=80 -> center = 139, which is top lane [0, 140)
    const result = detectLane(99, 80, twoLanes)
    expect(result).toBe('top')
  })
})
