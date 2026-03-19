import { describe, it, expect } from 'vitest'
import { LRUCache } from '../../expressions/cache.js'

describe('LRUCache', () => {
  it('stores and retrieves values', () => {
    const cache = new LRUCache<string, number>(10)
    cache.set('a', 1)
    cache.set('b', 2)
    expect(cache.get('a')).toBe(1)
    expect(cache.get('b')).toBe(2)
  })

  it('returns undefined for missing keys', () => {
    const cache = new LRUCache<string, number>(10)
    expect(cache.get('missing')).toBeUndefined()
  })

  it('reports correct size', () => {
    const cache = new LRUCache<string, number>(10)
    expect(cache.size).toBe(0)
    cache.set('a', 1)
    expect(cache.size).toBe(1)
    cache.set('b', 2)
    expect(cache.size).toBe(2)
  })

  it('evicts least recently used when at capacity', () => {
    const cache = new LRUCache<string, number>(3)
    cache.set('a', 1)
    cache.set('b', 2)
    cache.set('c', 3)
    // At capacity — adding 'd' should evict 'a' (oldest)
    cache.set('d', 4)
    expect(cache.size).toBe(3)
    expect(cache.get('a')).toBeUndefined()
    expect(cache.get('b')).toBe(2)
    expect(cache.get('c')).toBe(3)
    expect(cache.get('d')).toBe(4)
  })

  it('get() makes entry recently used (not evicted next)', () => {
    const cache = new LRUCache<string, number>(3)
    cache.set('a', 1)
    cache.set('b', 2)
    cache.set('c', 3)
    // Access 'a' to make it recently used
    cache.get('a')
    // Adding 'd' should evict 'b' (now the oldest), not 'a'
    cache.set('d', 4)
    expect(cache.get('a')).toBe(1)
    expect(cache.get('b')).toBeUndefined()
    expect(cache.get('c')).toBe(3)
    expect(cache.get('d')).toBe(4)
  })

  it('updating an existing key moves it to recently used', () => {
    const cache = new LRUCache<string, number>(3)
    cache.set('a', 1)
    cache.set('b', 2)
    cache.set('c', 3)
    // Update 'a' with new value
    cache.set('a', 10)
    // Adding 'd' should evict 'b' (now the oldest)
    cache.set('d', 4)
    expect(cache.get('a')).toBe(10)
    expect(cache.get('b')).toBeUndefined()
  })

  it('has() returns correct presence without affecting order', () => {
    const cache = new LRUCache<string, number>(3)
    cache.set('a', 1)
    expect(cache.has('a')).toBe(true)
    expect(cache.has('b')).toBe(false)
  })

  it('clear() empties the cache', () => {
    const cache = new LRUCache<string, number>(10)
    cache.set('a', 1)
    cache.set('b', 2)
    cache.clear()
    expect(cache.size).toBe(0)
    expect(cache.get('a')).toBeUndefined()
  })

  it('throws on capacity < 1', () => {
    expect(() => new LRUCache(0)).toThrow('capacity must be at least 1')
    expect(() => new LRUCache(-5)).toThrow('capacity must be at least 1')
  })

  it('works with capacity of 1', () => {
    const cache = new LRUCache<string, number>(1)
    cache.set('a', 1)
    expect(cache.get('a')).toBe(1)
    cache.set('b', 2)
    expect(cache.get('a')).toBeUndefined()
    expect(cache.get('b')).toBe(2)
  })

  it('evicts correctly at capacity 1000', () => {
    const cache = new LRUCache<number, number>(1000)
    // Fill to capacity
    for (let i = 0; i < 1000; i++) {
      cache.set(i, i * 10)
    }
    expect(cache.size).toBe(1000)
    // Adding one more should evict key 0
    cache.set(1000, 10000)
    expect(cache.size).toBe(1000)
    expect(cache.get(0)).toBeUndefined()
    expect(cache.get(1)).toBe(10)
    expect(cache.get(1000)).toBe(10000)
  })
})
