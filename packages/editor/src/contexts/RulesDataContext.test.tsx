import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { RulesDataProvider, useRulesData } from './RulesDataContext'
import type { RulesDataMap } from './RulesDataContext'

function wrapper(map: RulesDataMap) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <RulesDataProvider value={map}>{children}</RulesDataProvider>
  }
}

describe('useRulesData', () => {
  it('returns undefined when no provider wraps the component', () => {
    const { result } = renderHook(() => useRulesData('some/file.rules.yaml'))
    expect(result.current.rulesData).toBeUndefined()
    expect(result.current.validationErrors).toBeUndefined()
  })

  it('returns undefined when filePath is undefined', () => {
    const map: RulesDataMap = {
      'rules/discount.rules.yaml': {
        data: { hit_policy: 'first', rules: [] },
      },
    }
    const { result } = renderHook(() => useRulesData(undefined), {
      wrapper: wrapper(map),
    })
    expect(result.current.rulesData).toBeUndefined()
    expect(result.current.validationErrors).toBeUndefined()
  })

  it('returns correct data for a known file path', () => {
    const rulesData = {
      hit_policy: 'first' as const,
      rules: [{ when: { amount: { gt: 100 } }, then: { discount: 0.1 } }],
    }
    const map: RulesDataMap = {
      'rules/discount.rules.yaml': { data: rulesData },
    }
    const { result } = renderHook(
      () => useRulesData('rules/discount.rules.yaml'),
      { wrapper: wrapper(map) },
    )
    expect(result.current.rulesData).toBe(rulesData)
    expect(result.current.validationErrors).toBeUndefined()
  })

  it('returns undefined for an unknown file path', () => {
    const map: RulesDataMap = {
      'rules/discount.rules.yaml': {
        data: { hit_policy: 'first', rules: [] },
      },
    }
    const { result } = renderHook(
      () => useRulesData('rules/unknown.rules.yaml'),
      { wrapper: wrapper(map) },
    )
    expect(result.current.rulesData).toBeUndefined()
    expect(result.current.validationErrors).toBeUndefined()
  })

  it('returns validationErrors when present', () => {
    const errors = ['Missing required field: hit_policy']
    const map: RulesDataMap = {
      'rules/bad.rules.yaml': { validationErrors: errors },
    }
    const { result } = renderHook(
      () => useRulesData('rules/bad.rules.yaml'),
      { wrapper: wrapper(map) },
    )
    expect(result.current.rulesData).toBeUndefined()
    expect(result.current.validationErrors).toEqual(errors)
  })

  it('returns both data and validationErrors when both present', () => {
    const rulesData = { hit_policy: 'first' as const, rules: [] }
    const errors = ['Warning: undeclared input']
    const map: RulesDataMap = {
      'rules/warn.rules.yaml': { data: rulesData, validationErrors: errors },
    }
    const { result } = renderHook(
      () => useRulesData('rules/warn.rules.yaml'),
      { wrapper: wrapper(map) },
    )
    expect(result.current.rulesData).toBe(rulesData)
    expect(result.current.validationErrors).toEqual(errors)
  })
})
