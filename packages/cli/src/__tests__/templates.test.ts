import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from 'yaml'
import { validateYaml, serialize, validateRulesYaml } from '@ruminaider/flowprint-schema'
import type { FlowprintDocument } from '@ruminaider/flowprint-schema'
import { TEMPLATES_DIR, listTemplates, loadTemplate } from '../templates'

const templateDirs = readdirSync(TEMPLATES_DIR).filter((entry) => {
  const entryPath = join(TEMPLATES_DIR, entry)
  return require('node:fs').statSync(entryPath).isDirectory()
})

describe('templates', () => {
  describe('listTemplates', () => {
    it('returns all 10 templates', () => {
      const templates = listTemplates()
      expect(templates.length).toBe(10)
    })

    it('returns templates sorted by complexity', () => {
      const templates = listTemplates()
      const complexities = templates.map((t) => t.complexity)
      const order = { beginner: 0, intermediate: 1, advanced: 2, showcase: 3 }
      for (let i = 1; i < complexities.length; i++) {
        expect(order[complexities[i]!]).toBeGreaterThanOrEqual(order[complexities[i - 1]!])
      }
    })
  })

  describe('loadTemplate', () => {
    it('loads hello-world template', () => {
      const template = loadTemplate('hello-world')
      expect(template.name).toBe('hello-world')
      expect(template.complexity).toBe('beginner')
      expect(template.blueprintYaml).toContain('schema: flowprint/1.0')
      expect(template.readme).toBeTruthy()
    })

    it('throws for unknown template', () => {
      expect(() => loadTemplate('nonexistent')).toThrow('not found')
    })
  })

  describe.each(templateDirs)('template %s', (name) => {
    it('has valid metadata.yaml', () => {
      const metaPath = join(TEMPLATES_DIR, name, 'metadata.yaml')
      expect(existsSync(metaPath)).toBe(true)
      const meta = parse(readFileSync(metaPath, 'utf-8'))
      expect(meta.name).toBe(name)
      expect(meta.description).toBeTruthy()
      expect(['beginner', 'intermediate', 'advanced', 'showcase']).toContain(meta.complexity)
    })

    it('has valid blueprint', () => {
      const yamlContent = readFileSync(
        join(TEMPLATES_DIR, name, 'blueprint.flowprint.yaml'),
        'utf-8',
      )
      const result = validateYaml(yamlContent)
      if (!result.valid) {
        console.error(`Validation errors for ${name}:`, result.errors)
      }
      expect(result.valid).toBe(true)
    })

    it('round-trips through serialize', () => {
      const yamlContent = readFileSync(
        join(TEMPLATES_DIR, name, 'blueprint.flowprint.yaml'),
        'utf-8',
      )
      const doc = parse(yamlContent) as FlowprintDocument
      const reserialized = serialize(doc)
      expect(reserialized).toBe(yamlContent)
    })

    it('has valid rules files', () => {
      const rulesDir = join(TEMPLATES_DIR, name, 'rules')
      if (!existsSync(rulesDir)) return
      const rulesFiles = readdirSync(rulesDir).filter((f) => f.endsWith('.rules.yaml'))
      for (const file of rulesFiles) {
        const yamlContent = readFileSync(join(rulesDir, file), 'utf-8')
        const result = validateRulesYaml(yamlContent)
        if (!result.valid) {
          console.error(`Rules validation errors for ${name}/${file}:`, result.errors)
        }
        expect(result.valid).toBe(true)
      }
    })

    it('has a README', () => {
      const readmePath = join(TEMPLATES_DIR, name, 'README.md')
      expect(existsSync(readmePath)).toBe(true)
      const content = readFileSync(readmePath, 'utf-8')
      expect(content.length).toBeGreaterThan(10)
    })
  })
})
