import { describe, it, expect, vi } from 'vitest'
import { RealClock, TestClock } from '../../engine/clock.js'
import { parseDuration } from '../../engine/duration.js'

describe('RealClock', () => {
  it('now() returns a number close to Date.now()', () => {
    const clock = new RealClock()
    const before = Date.now()
    const result = clock.now()
    const after = Date.now()
    expect(result).toBeGreaterThanOrEqual(before)
    expect(result).toBeLessThanOrEqual(after)
  })

  it('setTimeout and clearTimeout delegate to global timers', () => {
    vi.useFakeTimers()
    try {
      const clock = new RealClock()
      const fn = vi.fn()
      clock.setTimeout(fn, 1000)
      vi.advanceTimersByTime(500)
      expect(fn).not.toHaveBeenCalled()
      vi.advanceTimersByTime(500)
      expect(fn).toHaveBeenCalledOnce()

      // clearTimeout prevents execution
      const fn2 = vi.fn()
      const id2 = clock.setTimeout(fn2, 1000)
      clock.clearTimeout(id2)
      vi.advanceTimersByTime(2000)
      expect(fn2).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('TestClock', () => {
  it('starts at time 0', () => {
    const clock = new TestClock()
    expect(clock.now()).toBe(0)
  })

  it('advance() moves time forward', () => {
    const clock = new TestClock()
    clock.advance(5000)
    expect(clock.now()).toBe(5000)
  })

  it('advance() fires timers in chronological order', () => {
    const clock = new TestClock()
    const order: number[] = []

    clock.setTimeout(() => order.push(1), 100)
    clock.setTimeout(() => order.push(2), 50)
    clock.setTimeout(() => order.push(3), 200)

    clock.advance(200)

    expect(order).toEqual([2, 1, 3])
  })

  it('advance() does not fire timers beyond the window', () => {
    const clock = new TestClock()
    const fn = vi.fn()

    clock.setTimeout(fn, 1000)
    clock.advance(500)

    expect(fn).not.toHaveBeenCalled()
    expect(clock.now()).toBe(500)
  })

  it('advance() fires timers at exact boundary', () => {
    const clock = new TestClock()
    const fn = vi.fn()

    clock.setTimeout(fn, 100)
    clock.advance(100)

    expect(fn).toHaveBeenCalledOnce()
  })

  it('clearTimeout prevents a timer from firing', () => {
    const clock = new TestClock()
    const fn = vi.fn()

    const id = clock.setTimeout(fn, 100)
    clock.clearTimeout(id)
    clock.advance(200)

    expect(fn).not.toHaveBeenCalled()
  })

  it('multiple advance() calls accumulate time', () => {
    const clock = new TestClock()
    const fn = vi.fn()

    clock.setTimeout(fn, 150)
    clock.advance(100)
    expect(fn).not.toHaveBeenCalled()
    clock.advance(100)
    expect(fn).toHaveBeenCalledOnce()
    expect(clock.now()).toBe(200)
  })

  it('timer fn runs at the correct currentTime', () => {
    const clock = new TestClock()
    let capturedTime = -1

    clock.setTimeout(() => {
      capturedTime = clock.now()
    }, 75)

    clock.advance(100)

    expect(capturedTime).toBe(75)
  })
})

describe('parseDuration', () => {
  it('parses PT24H', () => {
    expect(parseDuration('PT24H')).toBe(24 * 3600 * 1000)
  })

  it('parses PT30M', () => {
    expect(parseDuration('PT30M')).toBe(30 * 60 * 1000)
  })

  it('parses PT60S', () => {
    expect(parseDuration('PT60S')).toBe(60 * 1000)
  })

  it('parses combined PT1H30M15S', () => {
    expect(parseDuration('PT1H30M15S')).toBe((3600 + 1800 + 15) * 1000)
  })

  it('parses legacy shorthand 7d', () => {
    expect(parseDuration('7d')).toBe(7 * 86_400_000)
  })

  it('parses legacy shorthand 24h', () => {
    expect(parseDuration('24h')).toBe(24 * 3_600_000)
  })

  it('parses legacy shorthand 30m', () => {
    expect(parseDuration('30m')).toBe(30 * 60_000)
  })

  it('parses legacy shorthand 60s', () => {
    expect(parseDuration('60s')).toBe(60 * 1000)
  })

  it('throws on invalid format', () => {
    expect(() => parseDuration('invalid')).toThrow('Invalid duration')
  })

  it('throws on empty PT', () => {
    expect(() => parseDuration('PT')).toThrow('Invalid duration')
  })

  it('throws on P1D (day-level ISO not supported)', () => {
    expect(() => parseDuration('P1D')).toThrow('Invalid duration')
  })
})
