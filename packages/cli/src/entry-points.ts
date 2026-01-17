import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { dirname, resolve, join } from 'node:path'
import { createRequire } from 'node:module'
import { parse } from 'yaml'
import type { FlowprintDocument, EntryPoint } from '@ruminaider/flowprint-schema'

/**
 * Tree-sitter parser state. Lazily initialized on first use.
 * If initialization fails, we fall back to regex-based heuristics.
 */
let treeSitterReady: boolean | null = null
let ParserClass: typeof import('web-tree-sitter').Parser | null = null
let LanguageClass: typeof import('web-tree-sitter').Language | null = null
let parserInstance: import('web-tree-sitter').Parser | null = null
let languages: Record<string, import('web-tree-sitter').Language> = {}
let resolveRequire: ReturnType<typeof createRequire> | null = null

/**
 * Mapping from file extensions to grammar WASM file paths.
 */
const EXT_TO_GRAMMAR: Record<string, { pkg: string; wasm: string }> = {
  py: { pkg: 'tree-sitter-python', wasm: 'tree-sitter-python.wasm' },
  ts: { pkg: 'tree-sitter-typescript', wasm: 'tree-sitter-typescript.wasm' },
  tsx: { pkg: 'tree-sitter-typescript', wasm: 'tree-sitter-tsx.wasm' },
  js: { pkg: 'tree-sitter-javascript', wasm: 'tree-sitter-javascript.wasm' },
  jsx: { pkg: 'tree-sitter-javascript', wasm: 'tree-sitter-javascript.wasm' },
  mts: { pkg: 'tree-sitter-typescript', wasm: 'tree-sitter-typescript.wasm' },
  mjs: { pkg: 'tree-sitter-javascript', wasm: 'tree-sitter-javascript.wasm' },
  cts: { pkg: 'tree-sitter-typescript', wasm: 'tree-sitter-typescript.wasm' },
  cjs: { pkg: 'tree-sitter-javascript', wasm: 'tree-sitter-javascript.wasm' },
}

/**
 * Initialize tree-sitter parser. Returns true if ready, false if fallback needed.
 */
async function initTreeSitter(): Promise<boolean> {
  if (treeSitterReady !== null) return treeSitterReady

  try {
    // Use createRequire to load native/WASM modules at runtime.
    // This works whether the bundle is CJS or ESM.
    const req = createRequire(typeof __filename !== 'undefined' ? __filename : import.meta.url)
    resolveRequire = req

    const mod = req('web-tree-sitter') as Record<string, unknown>
    ParserClass = mod.Parser as typeof import('web-tree-sitter').Parser
    LanguageClass = mod.Language as typeof import('web-tree-sitter').Language

    const wasmPath = join(dirname(req.resolve('web-tree-sitter')), 'tree-sitter.wasm')

    await ParserClass.init({
      locateFile: () => wasmPath,
    })

    parserInstance = new ParserClass()
    treeSitterReady = true
    return true
  } catch {
    treeSitterReady = false
    return false
  }
}

/**
 * Load a tree-sitter language for the given file extension.
 */
async function loadLanguage(ext: string): Promise<import('web-tree-sitter').Language | null> {
  const grammarInfo = EXT_TO_GRAMMAR[ext]
  if (!grammarInfo || !LanguageClass || !resolveRequire) return null

  const wasmKey = grammarInfo.wasm
  if (languages[wasmKey]) return languages[wasmKey]!

  try {
    const pkgDir = dirname(resolveRequire.resolve(`${grammarInfo.pkg}/package.json`))
    const wasmPath = join(pkgDir, grammarInfo.wasm)
    const lang = await LanguageClass.load(wasmPath)
    languages[wasmKey] = lang
    return lang
  } catch {
    return null
  }
}

/**
 * Tree-sitter node types that define symbols in each language.
 *
 * Python: function_definition, class_definition
 * TypeScript/JavaScript: function_declaration, class_declaration,
 *   variable_declarator (for const/let/var), lexical_declaration,
 *   export_statement wrapping any of the above
 */

/**
 * Use tree-sitter to check if a symbol is defined in the given source.
 * Returns true if found, false if not found, undefined if tree-sitter cannot handle it.
 */
async function checkSymbolTreeSitter(
  content: string,
  ext: string,
  symbol: string,
): Promise<boolean | undefined> {
  if (!parserInstance) return undefined

  const lang = await loadLanguage(ext)
  if (!lang) return undefined

  parserInstance.setLanguage(lang)
  const tree = parserInstance.parse(content)
  if (!tree) return undefined

  try {
    const root = tree.rootNode

    if (ext === 'py') {
      return findPythonSymbol(root, symbol)
    }

    // TypeScript / JavaScript
    return findTsJsSymbol(root, symbol)
  } finally {
    tree.delete()
  }
}

/**
 * Find a symbol definition in a Python AST.
 */
function findPythonSymbol(root: import('web-tree-sitter').Node, symbol: string): boolean {
  // Look for function_definition and class_definition at the module level
  // and also async function definitions
  const defs = root.descendantsOfType(['function_definition', 'class_definition'])

  for (const def of defs) {
    if (!def) continue
    const nameNode = def.childForFieldName('name')
    if (nameNode?.text === symbol) return true
  }

  return false
}

/**
 * Find a symbol definition in a TypeScript/JavaScript AST.
 */
function findTsJsSymbol(root: import('web-tree-sitter').Node, symbol: string): boolean {
  // Check function declarations
  const funcDecls = root.descendantsOfType([
    'function_declaration',
    'generator_function_declaration',
  ])
  for (const decl of funcDecls) {
    if (!decl) continue
    const nameNode = decl.childForFieldName('name')
    if (nameNode?.text === symbol) return true
  }

  // Check class declarations
  const classDecls = root.descendantsOfType(['class_declaration'])
  for (const decl of classDecls) {
    if (!decl) continue
    const nameNode = decl.childForFieldName('name')
    if (nameNode?.text === symbol) return true
  }

  // Check variable declarations (const/let/var)
  const varDeclarators = root.descendantsOfType(['variable_declarator'])
  for (const decl of varDeclarators) {
    if (!decl) continue
    const nameNode = decl.childForFieldName('name')
    if (nameNode?.text === symbol) return true
  }

  return false
}

/**
 * Check that entry point files exist and optionally verify symbols.
 * Returns an array of warning messages for broken references.
 *
 * Symbol-level checking uses tree-sitter WASM parsers when available,
 * falling back to simple regex-based heuristics if tree-sitter fails
 * to load:
 * - Python: `def <symbol>` or `class <symbol>`
 * - TypeScript/JavaScript: `function <symbol>`, `export function <symbol>`,
 *   `const <symbol>`, `export const <symbol>`, `class <symbol>`
 *
 * For unsupported file types, only file existence is checked.
 */
export async function checkEntryPoints(yamlContent: string, filePath: string): Promise<string[]> {
  const warnings: string[] = []
  const doc = parse(yamlContent) as FlowprintDocument

  if (!doc?.nodes) return warnings

  // Find the project root by walking up from the file looking for package.json or .git
  const projectRoot = findProjectRoot(dirname(filePath))

  // Try to initialize tree-sitter (lazy, only on first call)
  await initTreeSitter()

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
 *
 * Tries tree-sitter first, falls back to regex if tree-sitter is unavailable.
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

  // Try tree-sitter first
  if (treeSitterReady) {
    const result = await checkSymbolTreeSitter(content, ext, symbol)
    if (result !== undefined) return result
    // If tree-sitter returned undefined for this specific language, fall through to regex
  }

  // Regex fallback
  return checkSymbolRegex(content, ext, symbol)
}

/**
 * Regex-based symbol checking fallback.
 */
function checkSymbolRegex(content: string, ext: string, symbol: string): boolean {
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

/**
 * Reset tree-sitter state. Used for testing.
 */
export function _resetTreeSitterState(): void {
  if (parserInstance) {
    parserInstance.delete()
    parserInstance = null
  }
  treeSitterReady = null
  ParserClass = null
  LanguageClass = null
  resolveRequire = null
  languages = {}
}
