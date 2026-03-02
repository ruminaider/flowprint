import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { parse } from 'yaml'
import type { TemplateMetadata, LoadedTemplate } from './types'

/** Root directory containing template data files (resolved from dist/ at runtime). */
const TEMPLATES_DIR = resolve(__dirname, '..', '..', 'templates')

export { TEMPLATES_DIR }

/**
 * Parse the metadata.yaml file in a template directory.
 */
function readMetadata(templateDir: string): TemplateMetadata {
  const metaPath = join(templateDir, 'metadata.yaml')
  const raw = readFileSync(metaPath, 'utf-8')
  return parse(raw) as TemplateMetadata
}

/**
 * List all available templates with their metadata.
 */
export function listTemplates(): TemplateMetadata[] {
  if (!existsSync(TEMPLATES_DIR)) return []

  return readdirSync(TEMPLATES_DIR)
    .filter((entry) => {
      const entryPath = join(TEMPLATES_DIR, entry)
      return statSync(entryPath).isDirectory()
    })
    .map((dir) => readMetadata(join(TEMPLATES_DIR, dir)))
    .sort((a, b) => {
      const order = { beginner: 0, intermediate: 1, advanced: 2, showcase: 3 }
      return order[a.complexity] - order[b.complexity]
    })
}

/**
 * Load a template by name, returning its blueprint YAML, rules files, and readme.
 */
export function loadTemplate(name: string): LoadedTemplate {
  const templateDir = join(TEMPLATES_DIR, name)
  if (!existsSync(templateDir)) {
    throw new Error(`Template "${name}" not found`)
  }

  const metadata = readMetadata(templateDir)
  const blueprintPath = join(templateDir, 'blueprint.flowprint.yaml')
  const blueprintYaml = readFileSync(blueprintPath, 'utf-8')

  // Collect rules files
  const rulesFiles: Record<string, string> = {}
  const rulesDir = join(templateDir, 'rules')
  if (existsSync(rulesDir)) {
    for (const file of readdirSync(rulesDir)) {
      if (file.endsWith('.rules.yaml')) {
        rulesFiles[file] = readFileSync(join(rulesDir, file), 'utf-8')
      }
    }
  }

  // Read README
  const readmePath = join(templateDir, 'README.md')
  const readme = existsSync(readmePath) ? readFileSync(readmePath, 'utf-8') : ''

  return {
    ...metadata,
    blueprintYaml,
    rulesFiles,
    readme,
  }
}
