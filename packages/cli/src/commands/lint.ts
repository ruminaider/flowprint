import { Command } from 'commander'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import chalk from 'chalk'
import { glob } from 'glob'
import { parse } from 'yaml'
import type { FlowprintDocument } from '@ruminaider/flowprint-schema'
import { nodeNaming } from '../lint-rules/node-naming.js'
import { laneOrdering } from '../lint-rules/lane-ordering.js'
import { requireDescription } from '../lint-rules/require-description.js'
import { noEmptyBranches } from '../lint-rules/no-empty-branches.js'
import type { LintRule, LintSeverity, LintDiagnostic } from '../lint-rules/types.js'

const ALL_RULES: LintRule[] = [nodeNaming, laneOrdering, requireDescription, noEmptyBranches]

const DEFAULT_SEVERITY: Record<string, LintSeverity> = {
  'node-naming': 'warn',
  'lane-ordering': 'error',
  'require-description': 'off',
  'no-empty-branches': 'error',
}

export const lintCommand = new Command('lint')
  .description('Lint .flowprint.yaml files with configurable style rules')
  .argument('<glob>', 'Glob pattern matching .flowprint.yaml files')
  .option('--config <path>', 'Path to .flowprintrc.yaml config file')
  .addHelpText(
    'after',
    '\nRules:\n' +
      '  node-naming         Enforce snake_case for node IDs (default: warn)\n' +
      '  lane-ordering       External lanes before internal (default: error)\n' +
      '  require-description Action nodes should have descriptions (default: off)\n' +
      '  no-empty-branches   Parallel nodes must have non-empty branches (default: error)\n' +
      '\nExit codes:\n  0  No errors\n  1  Lint errors found\n  2  File not found or parse error',
  )
  .action(async (pattern: string, opts: { config?: string }) => {
    const files = await glob(pattern)

    if (files.length === 0) {
      console.error(chalk.red(`No files found matching pattern: ${pattern}`))
      process.exit(2)
    }

    const config = loadConfig(opts.config)
    let hasErrors = false
    let hasFileErrors = false

    for (const file of files.sort()) {
      const filePath = resolve(file)
      let content: string

      try {
        content = readFileSync(filePath, 'utf-8')
      } catch {
        console.error(chalk.red(`  File not found or unreadable: ${file}`))
        hasFileErrors = true
        continue
      }

      let doc: FlowprintDocument
      try {
        const raw = parse(content) as unknown
        if (raw == null || typeof raw !== 'object' || !('nodes' in raw) || !('lanes' in raw)) {
          console.error(chalk.red(`  Invalid flowprint document: ${file}`))
          hasFileErrors = true
          continue
        }
        doc = raw as FlowprintDocument
      } catch {
        console.error(chalk.red(`  Failed to parse YAML: ${file}`))
        hasFileErrors = true
        continue
      }

      const diagnostics: LintDiagnostic[] = []

      for (const rule of ALL_RULES) {
        const severity = config[rule.name] ?? DEFAULT_SEVERITY[rule.name] ?? 'off'
        if (severity === 'off') continue

        const results = rule.check(doc)
        for (const result of results) {
          diagnostics.push({ ...result, severity })
        }
      }

      const errors = diagnostics.filter((d) => d.severity === 'error')
      const warnings = diagnostics.filter((d) => d.severity === 'warn')

      if (errors.length > 0) {
        hasErrors = true
        console.log(chalk.red(`  FAIL  ${file}`))
      } else if (warnings.length > 0) {
        console.log(chalk.yellow(`  WARN  ${file}`))
      } else {
        console.log(chalk.green(`  PASS  ${file}`))
      }

      for (const d of diagnostics) {
        if (d.severity === 'error') {
          console.log(chalk.red(`    ${d.rule} ${d.path}: ${d.message}`))
        } else {
          console.log(chalk.yellow(`    ${d.rule} ${d.path}: ${d.message}`))
        }
      }
    }

    if (hasFileErrors) {
      process.exit(2)
    }
    if (hasErrors) {
      process.exit(1)
    }
    process.exit(0)
  })

function loadConfig(configPath?: string): Record<string, LintSeverity> {
  // Try explicit config path first
  if (configPath) {
    try {
      const content = readFileSync(resolve(configPath), 'utf-8')
      return parseConfig(content)
    } catch {
      console.error(chalk.red(`Could not read config file: ${configPath}`))
      process.exit(2)
    }
  }

  // Try default config locations
  const defaultPaths = ['.flowprintrc.yaml', '.flowprintrc.yml']
  for (const p of defaultPaths) {
    const fullPath = resolve(p)
    if (existsSync(fullPath)) {
      try {
        const content = readFileSync(fullPath, 'utf-8')
        return parseConfig(content)
      } catch {
        // Ignore unreadable default config
      }
    }
  }

  return DEFAULT_SEVERITY
}

function parseConfig(content: string): Record<string, LintSeverity> {
  const config = parse(content) as Record<string, unknown> | null
  const rules = (config?.rules ?? config) as Record<string, string> | undefined
  if (!rules || typeof rules !== 'object') return DEFAULT_SEVERITY

  const result: Record<string, LintSeverity> = { ...DEFAULT_SEVERITY }
  for (const [key, value] of Object.entries(rules)) {
    if (value === 'error' || value === 'warn' || value === 'off') {
      result[key] = value
    }
  }
  return result
}
