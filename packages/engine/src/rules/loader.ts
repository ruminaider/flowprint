import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse } from 'yaml'
import { validateRules } from '@ruminaider/flowprint-schema'
import type { RulesDocument } from './types.js'

/**
 * Load and validate a `.rules.yaml` file.
 *
 * @param filePath - Relative path to the rules file
 * @param projectRoot - Root directory for path resolution
 * @returns Parsed and validated RulesDocument
 */
export function loadRulesFile(filePath: string, projectRoot: string): RulesDocument {
  const absolutePath = resolve(projectRoot, filePath)

  let content: string
  try {
    content = readFileSync(absolutePath, 'utf-8')
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    throw new Error(
      `Failed to load rules file "${filePath}" (resolved to ${absolutePath}): ${message}`,
    )
  }

  let doc: unknown
  try {
    doc = parse(content)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    throw new Error(`Failed to parse rules file "${filePath}": ${message}`)
  }

  const result = validateRules(doc)
  const errors = result.errors.filter((e) => e.severity === 'error')
  if (errors.length > 0) {
    const messages = errors.map((e) => `  ${e.path}: ${e.message}`).join('\n')
    throw new Error(`Rules file "${filePath}" has validation errors:\n${messages}`)
  }

  return doc as RulesDocument
}
