/**
 * Minimal LRU (Least Recently Used) cache.
 *
 * Uses a Map's insertion-order iteration to track recency.
 * On get: deletes and re-inserts the entry to move it to the end (most recent).
 * On set at capacity: deletes the first entry (least recently used).
 *
 * Zero external dependencies.
 */
export class LRUCache<K, V> {
  private readonly map = new Map<K, V>()
  readonly capacity: number

  constructor(capacity: number) {
    if (capacity < 1) {
      throw new Error('LRU cache capacity must be at least 1')
    }
    this.capacity = capacity
  }

  get(key: K): V | undefined {
    if (!this.map.has(key)) {
      return undefined
    }
    // Move to end (most recently used) by delete + re-insert
    const value = this.map.get(key)!
    this.map.delete(key)
    this.map.set(key, value)
    return value
  }

  set(key: K, value: V): void {
    if (this.map.has(key)) {
      // Update existing: delete + re-insert to move to end
      this.map.delete(key)
    } else if (this.map.size >= this.capacity) {
      // Evict least recently used (first entry in Map iteration order)
      const oldest = this.map.keys().next().value as K
      this.map.delete(oldest)
    }
    this.map.set(key, value)
  }

  has(key: K): boolean {
    return this.map.has(key)
  }

  get size(): number {
    return this.map.size
  }

  clear(): void {
    this.map.clear()
  }
}
