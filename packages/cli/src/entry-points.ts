import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { parse } from 'yaml'
import type { FlowprintDocument, EntryPoint } from '@ruminaider/flowprint-schema'

/**
 * Check that entry point files exist and optionally verify symbols.
 * Returns an array of warning messages for broken references.
 *
 * Symbol-level checking uses simple regex-based heuristics:
 * - Python: `def <symbol>` or `class <symbol>`
 * - TypeScript/JavaScript: `function <symbol>`, `export function <symbol>`,
 *   `const <symbol>`, `export const <symbol>`, `class <symbol>`
 *
 * For unsupported file types, only file existence is checked.
 */
export async function checkEntryPoints(
  yamlContent: string,
  filePath: string,
): Promise<string[]> {
  const warnings: string[] = []
  const doc = parse(yamlContent) as FlowprintDocument

  if (!doc?.nodes) return warnings

  // Find the project root by walking up from the file looking for package.json or .git
  const projectRoot = findProjectRoot(dirname(filePath))

  for (const [nodeId, node] of Object.entries(doc.nodes)) {
    if (node.type === 'terminal') continue
    const entryPoints = node.entry_points
    if (!entryPoints) continue

    for (const ep of entryPoints) {
      const epPath = resolve(projectRoot, ep.file)

      if (!existsSync(epPath)) {
        warnings.push(`${nodeId}: file not found: ${ep.file}`)
        continue
      }

      // Try symbol-level check for supported languages
      const symbolFound = await checkSymbol(epPath, ep)
      if (symbolFound === false) {
        warnings.push(`${nodeId}: symbol "${ep.symbol}" not found in ${ep.file}`)
      }
    }
  }

  return warnings
}

/**
 * Check if a symbol is defined in the given file.
 * Returns true if found, false if not found, undefined if the language is unsupported.
 */
async function checkSymbol(filePath: string, ep: EntryPoint): Promise<boolean | undefined> {
  const ext = filePath.split('.').pop()?.toLowerCase()
  if (!ext) return undefined

  const supportedExts = ['py', 'ts', 'tsx', 'js', 'jsx', 'mts', 'mjs', 'cts', 'cjs']
  if (!supportedExts.includes(ext)) return undefined

  let content: string
  try {
    content = await readFile(filePath, 'utf-8')
  } catch {
    return undefined
  }

  const symbol = ep.symbol

  if (ext === 'py') {
    // Python: def symbol or class symbol
    const pyPattern = new RegExp(`^(?:async\\s+)?(?:def|class)\\s+${escapeRegex(symbol)}\\b`, 'm')
    return pyPattern.test(content)
  }

  // TypeScript / JavaScript
  const tsPatterns = [
    new RegExp(`(?:export\\s+)?(?:async\\s+)?function\\s+${escapeRegex(symbol)}\\b`, 'm'),
    new RegExp(`(?:export\\s+)?(?:const|let|var)\\s+${escapeRegex(symbol)}\\b`, 'm'),
    new RegExp(`(?:export\\s+)?class\\s+${escapeRegex(symbol)}\\b`, 'm'),
  ]
  return tsPatterns.some((p) => p.test(content))
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function findProjectRoot(startDir: string): string {
  let dir = startDir
  const { root } = { root: '/' }
  while (dir !== root) {
    if (existsSync(resolve(dir, '.git')) || existsSync(resolve(dir, 'package.json'))) {
      return dir
    }
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return startDir
}
