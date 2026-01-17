import { describe, it, expect } from 'vitest'
import { snapToLane } from './useLaneSnap'
import { NODE_HEIGHT } from '../layout/constants'
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
  makeLane({ laneId: 'bottom', y: 160, height: 140, order: 1, visibility: 'internal' }),
]

describe('snapToLane', () => {
  describe('within-lane snap', () => {
    it('returns the lane and centered snappedY when y is inside a lane band', () => {
      const result = snapToLane(50, twoLanes)
      expect(result).toEqual({
        laneId: 'top',
        snappedY: 0 + (140 - NODE_HEIGHT) / 2,
      })
    })

    it('returns the bottom lane when y is inside the bottom band', () => {
      const result = snapToLane(200, twoLanes)
      expect(result).toEqual({
        laneId: 'bottom',
        snappedY: 160 + (140 - NODE_HEIGHT) / 2,
      })
    })
  })

  describe('between-lane snap', () => {
    it('snaps to the nearest lane when y is between two lane bands', () => {
      // Gap is from y=140 to y=160. Midpoint is 150.
      // y=145 is closer to top lane (bottom edge at 140, dist=5) than bottom lane (top edge at 160, dist=15)
      const result = snapToLane(145, twoLanes)
      expect(result).toEqual({
        laneId: 'top',
        snappedY: 0 + (140 - NODE_HEIGHT) / 2,
      })
    })

    it('snaps to the bottom lane when y is closer to it in the gap', () => {
      // y=155 is closer to bottom lane (top edge at 160, dist=5) than top lane (bottom edge at 140, dist=15)
      const result = snapToLane(155, twoLanes)
      expect(result).toEqual({
        laneId: 'bottom',
        snappedY: 160 + (140 - NODE_HEIGHT) / 2,
      })
    })

    it('snaps to the nearest lane at the exact midpoint of a gap', () => {
      // y=150 is equidistant (10 from each). The first lane with the smallest distance wins.
      const result = snapToLane(150, twoLanes)
      expect(result).not.toBeNull()
      // Both are dist=10; top lane is checked first (sorted by y), so top wins
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      expect(result!.laneId).toBe('top')
    })
  })

  describe('outside all lanes returns null', () => {
    it('returns null when y is above all lane bands', () => {
      const result = snapToLane(-10, twoLanes)
      expect(result).toBeNull()
    })

    it('returns null when y is below all lane bands', () => {
      const result = snapToLane(300, twoLanes) // bottom lane ends at 160 + 140 = 300
      expect(result).toBeNull()
    })

    it('returns null when y is well below all lane bands', () => {
      const result = snapToLane(500, twoLanes)
      expect(result).toBeNull()
    })

    it('returns null for an empty lanes array', () => {
      const result = snapToLane(50, [])
      expect(result).toBeNull()
    })
  })

  describe('edge cases -- lane boundaries', () => {
    it('snaps to the lane when y is exactly at the lane top (inclusive)', () => {
      const result = snapToLane(0, twoLanes)
      expect(result).toEqual({
        laneId: 'top',
        snappedY: (140 - NODE_HEIGHT) / 2,
      })
    })

    it('returns null when y is exactly at the bottom edge of the last lane (exclusive)', () => {
      // Bottom lane: y=160, height=140, so bottom edge = 300. y >= 300 is outside.
      const result = snapToLane(300, twoLanes)
      expect(result).toBeNull()
    })

    it('snaps to the bottom lane when y is exactly at the bottom lane top', () => {
      const result = snapToLane(160, twoLanes)
      expect(result).toEqual({
        laneId: 'bottom',
        snappedY: 160 + (140 - NODE_HEIGHT) / 2,
      })
    })

    it('snaps to the top lane when y is just below top lane bottom (in gap)', () => {
      // y=140 is just past the top lane (which covers [0, 140)). It's in the gap.
      // dist to top lane bottom edge (140) = 0, dist to bottom lane top edge (160) = 20
      const result = snapToLane(140, twoLanes)
      expect(result).toEqual({
        laneId: 'top',
        snappedY: (140 - NODE_HEIGHT) / 2,
      })
    })
  })

  describe('multiple lanes with different heights', () => {
    const threeLanes: LaneBand[] = [
      makeLane({ laneId: 'small', y: 0, height: 100, order: 0 }),
      makeLane({ laneId: 'large', y: 120, height: 300, order: 1 }),
      makeLane({ laneId: 'medium', y: 440, height: 180, order: 2, visibility: 'internal' }),
    ]

    it('centers snappedY correctly in a small lane', () => {
      const result = snapToLane(50, threeLanes)
      expect(result).toEqual({
        laneId: 'small',
        snappedY: 0 + (100 - NODE_HEIGHT) / 2,
      })
    })

    it('centers snappedY correctly in a large lane', () => {
      const result = snapToLane(250, threeLanes)
      expect(result).toEqual({
        laneId: 'large',
        snappedY: 120 + (300 - NODE_HEIGHT) / 2,
      })
    })

    it('centers snappedY correctly in a medium lane', () => {
      const result = snapToLane(500, threeLanes)
      expect(result).toEqual({
        laneId: 'medium',
        snappedY: 440 + (180 - NODE_HEIGHT) / 2,
      })
    })

    it('snaps to nearest lane between large and medium lane', () => {
      // Gap between large and medium: [420, 440). y=430 -> dist to large bottom (420) = 10, dist to medium top (440) = 10
      // Equal distance, first in sorted order (large) wins
      const result = snapToLane(430, threeLanes)
      expect(result).not.toBeNull()
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      expect(result!.laneId).toBe('large')
    })

    it('snaps to medium lane when closer to it in the gap', () => {
      // y=435 -> dist to large bottom (420) = 15, dist to medium top (440) = 5
      const result = snapToLane(435, threeLanes)
      expect(result).toEqual({
        laneId: 'medium',
        snappedY: 440 + (180 - NODE_HEIGHT) / 2,
      })
    })

    it('handles lanes not passed in sorted order', () => {
      const unordered: LaneBand[] = [
        makeLane({ laneId: 'medium', y: 440, height: 180, order: 2 }),
        makeLane({ laneId: 'small', y: 0, height: 100, order: 0 }),
        makeLane({ laneId: 'large', y: 120, height: 300, order: 1 }),
      ]
      const result = snapToLane(50, unordered)
      expect(result).toEqual({
        laneId: 'small',
        snappedY: (100 - NODE_HEIGHT) / 2,
      })
    })
  })
})
