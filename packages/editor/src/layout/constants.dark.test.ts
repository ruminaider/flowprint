import { describe, it, expect } from 'vitest'
import {
  LANE_COLORS,
  LANE_BORDER_COLORS,
  DARK_LANE_COLORS,
  DARK_LANE_BORDER_COLORS,
  LANE_COLOR_COUNT,
} from './constants'

describe('DARK_LANE_COLORS', () => {
  it(`defines all ${LANE_COLOR_COUNT} dark lane colors`, () => {
    expect(Object.keys(DARK_LANE_COLORS)).toHaveLength(LANE_COLOR_COUNT)
    for (let i = 0; i < LANE_COLOR_COUNT; i++) {
      expect(DARK_LANE_COLORS[i]).toBeDefined()
      expect(DARK_LANE_COLORS[i]).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })

  it('does not overlap with light lane colors', () => {
    const lightValues = new Set(Object.values(LANE_COLORS))
    for (const darkValue of Object.values(DARK_LANE_COLORS)) {
      expect(lightValues.has(darkValue)).toBe(false)
    }
  })
})

describe('DARK_LANE_BORDER_COLORS', () => {
  it(`defines all ${LANE_COLOR_COUNT} dark lane border colors`, () => {
    expect(Object.keys(DARK_LANE_BORDER_COLORS)).toHaveLength(LANE_COLOR_COUNT)
    for (let i = 0; i < LANE_COLOR_COUNT; i++) {
      expect(DARK_LANE_BORDER_COLORS[i]).toBeDefined()
      expect(DARK_LANE_BORDER_COLORS[i]).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })

  it('does not overlap with light lane border colors', () => {
    const lightValues = new Set(Object.values(LANE_BORDER_COLORS))
    for (const darkValue of Object.values(DARK_LANE_BORDER_COLORS)) {
      expect(lightValues.has(darkValue)).toBe(false)
    }
  })
})
