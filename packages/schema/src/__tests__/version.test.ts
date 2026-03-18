import { describe, it, expect } from 'vitest'
import { parseVersion, compareVersions, isMajorBump } from '../version.js'

describe('parseVersion', () => {
  it('parses flowprint/1.0', () => {
    expect(parseVersion('flowprint/1.0')).toEqual({ major: 1, minor: 0 })
  })

  it('parses flowprint/2.13', () => {
    expect(parseVersion('flowprint/2.13')).toEqual({ major: 2, minor: 13 })
  })

  it('throws on invalid format', () => {
    expect(() => parseVersion('invalid')).toThrow('Invalid version format')
    expect(() => parseVersion('flowprint/')).toThrow()
    expect(() => parseVersion('flowprint/abc')).toThrow()
    expect(() => parseVersion('')).toThrow()
  })
})

describe('compareVersions', () => {
  it('returns 0 for equal versions', () => {
    expect(compareVersions('flowprint/1.0', 'flowprint/1.0')).toBe(0)
  })

  it('returns negative when a < b', () => {
    expect(compareVersions('flowprint/1.0', 'flowprint/1.1')).toBeLessThan(0)
    expect(compareVersions('flowprint/1.9', 'flowprint/2.0')).toBeLessThan(0)
  })

  it('returns positive when a > b', () => {
    expect(compareVersions('flowprint/1.1', 'flowprint/1.0')).toBeGreaterThan(0)
    expect(compareVersions('flowprint/2.0', 'flowprint/1.9')).toBeGreaterThan(0)
  })

  it('compares major before minor', () => {
    expect(compareVersions('flowprint/2.0', 'flowprint/1.99')).toBeGreaterThan(0)
  })
})

describe('isMajorBump', () => {
  it('returns false for same major', () => {
    expect(isMajorBump('flowprint/1.0', 'flowprint/1.5')).toBe(false)
  })

  it('returns true for different major', () => {
    expect(isMajorBump('flowprint/1.0', 'flowprint/2.0')).toBe(true)
  })
})
