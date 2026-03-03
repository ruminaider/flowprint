import { describe, it, expect } from 'vitest'
import { getTemplates, loadTemplate } from './templates'

describe('getTemplates', () => {
  it('returns all 10 templates', () => {
    const templates = getTemplates()
    expect(templates).toHaveLength(10)
  })

  it('each template has required metadata fields', () => {
    for (const t of getTemplates()) {
      expect(t.id).toBeTruthy()
      expect(t.name).toBeTruthy()
      expect(t.description).toBeTruthy()
      expect(['beginner', 'intermediate', 'advanced', 'showcase']).toContain(t.complexity)
      expect(t.nodeCount).toBeGreaterThan(0)
      expect(t.laneCount).toBeGreaterThan(0)
    }
  })

  it('templates are ordered by complexity', () => {
    const order = { beginner: 0, intermediate: 1, advanced: 2, showcase: 3 }
    const templates = getTemplates()
    for (let i = 1; i < templates.length; i++) {
      const curr = templates[i]!
      const prev = templates[i - 1]!
      expect(order[curr.complexity]).toBeGreaterThanOrEqual(order[prev.complexity])
    }
  })
})

describe('loadTemplate', () => {
  it('returns a valid FlowprintDocument for each template', () => {
    for (const t of getTemplates()) {
      const doc = loadTemplate(t.id)
      expect(doc.schema).toBe('flowprint/1.0')
      expect(doc.lanes).toBeTruthy()
      expect(doc.nodes).toBeTruthy()
      expect(Object.keys(doc.nodes).length).toBeGreaterThan(0)
    }
  })

  it('throws for unknown template id', () => {
    expect(() => loadTemplate('nonexistent')).toThrow()
  })
})
