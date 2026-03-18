import { describe, it, expect } from 'vitest'
import { getActionMode, getActionModeInfo } from '../action-mode'

describe('getActionMode', () => {
  it('returns "transform" when expressions field is present', () => {
    expect(getActionMode({ expressions: { total: 'a + b' } })).toBe('transform')
  })

  it('returns "decision-table" when rules field is present', () => {
    expect(getActionMode({ rules: { file: 'pricing.rules.yaml' } })).toBe('decision-table')
  })

  it('returns "handler" when neither expressions nor rules are present', () => {
    expect(getActionMode({ entry_points: [] })).toBe('handler')
  })

  it('returns "handler" for empty data', () => {
    expect(getActionMode({})).toBe('handler')
  })

  it('prefers transform over decision-table when both present', () => {
    // Schema enforces mutual exclusivity, but if both are present, expressions wins
    expect(
      getActionMode({
        expressions: { x: '1' },
        rules: { file: 'test.rules.yaml' },
      }),
    ).toBe('transform')
  })
})

describe('getActionModeInfo', () => {
  it('returns Calculator icon info for transform mode', () => {
    const info = getActionModeInfo({ expressions: { total: 'a + b' } })
    expect(info.mode).toBe('transform')
    expect(info.subtitle).toBe('Transform')
    expect(info.icon).toBeDefined()
  })

  it('returns Table icon info for decision-table mode', () => {
    const info = getActionModeInfo({ rules: { file: 'pricing.rules.yaml' } })
    expect(info.mode).toBe('decision-table')
    expect(info.subtitle).toBe('Decision Table')
    expect(info.icon).toBeDefined()
  })

  it('returns Zap icon info for handler mode', () => {
    const info = getActionModeInfo({})
    expect(info.mode).toBe('handler')
    expect(info.subtitle).toBe('')
    expect(info.icon).toBeDefined()
  })
})
