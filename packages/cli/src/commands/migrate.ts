import { Command } from 'commander'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import chalk from 'chalk'
import { glob } from 'glob'
import { parse } from 'yaml'
import { serialize } from '@ruminaider/flowprint-schema'
import type { FlowprintDocument } from '@ruminaider/flowprint-schema'

// join_strategy migration map
const JOIN_STRATEGY_MAP: Record<string, string> = {
  all_reached: 'all',
  await_all: 'all',
}

// Expression-like patterns that indicate a `when` value is already an expression
const EXPRESSION_PATTERNS = /[=!><&|().]/

interface MigrateStats {
  migrated: number
  skipped: number
  warnings: number
  errors: number
}

export const migrateCommand = new Command('migrate')
  .description('Migrate .flowprint.yaml files from 1.0 to 2.0')
  .argument('<glob>', 'Glob pattern matching .flowprint.yaml files')
  .option('--dry-run', 'Show changes without writing files')
  .addHelpText('after', '\nExit codes:\n  0  Success\n  1  Errors occurred\n  2  No files found')
  .action(async (pattern: string, opts: { dryRun?: boolean }) => {
    const files = await glob(pattern)

    if (files.length === 0) {
      console.error(chalk.red(`No files found matching pattern: ${pattern}`))
      process.exit(2)
    }

    const stats: MigrateStats = { migrated: 0, skipped: 0, warnings: 0, errors: 0 }

    for (const file of files.sort()) {
      const filePath = resolve(file)
      let content: string

      try {
        content = readFileSync(filePath, 'utf-8')
      } catch {
        console.error(chalk.red(`  Error reading file: ${file}`))
        stats.errors++
        continue
      }

      let doc: Record<string, unknown>
      try {
        const raw = parse(content) as unknown
        if (raw == null || typeof raw !== 'object') {
          console.error(chalk.red(`  Invalid YAML document: ${file}`))
          stats.errors++
          continue
        }
        doc = raw as Record<string, unknown>
      } catch {
        console.error(chalk.red(`  Failed to parse YAML: ${file}`))
        stats.errors++
        continue
      }

      const schemaVersion = doc.schema as string | undefined

      // Already at 2.0 — skip
      if (schemaVersion === 'flowprint/2.0') {
        console.log(chalk.dim(`  SKIP  ${file} (already at flowprint/2.0)`))
        stats.skipped++
        continue
      }

      // Not at 1.0 — error
      if (schemaVersion !== 'flowprint/1.0') {
        console.error(
          chalk.red(`  Error: ${file} has unsupported schema version: ${String(schemaVersion)}`),
        )
        stats.errors++
        continue
      }

      // Migrate 1.0 -> 2.0
      doc.schema = 'flowprint/2.0'

      // Migrate nodes
      const nodes = doc.nodes as Record<string, Record<string, unknown>> | undefined
      if (nodes && typeof nodes === 'object') {
        for (const [nodeId, node] of Object.entries(nodes)) {
          if (node.type === 'parallel' && typeof node.join_strategy === 'string') {
            const oldStrategy = node.join_strategy
            const newStrategy = JOIN_STRATEGY_MAP[oldStrategy]
            if (newStrategy) {
              node.join_strategy = newStrategy
            }
          }

          if (node.type === 'switch' && Array.isArray(node.cases)) {
            for (const c of node.cases as Record<string, unknown>[]) {
              const when = c.when
              if (typeof when === 'string' && !EXPRESSION_PATTERNS.test(when)) {
                console.log(
                  chalk.yellow(
                    `  WARN  ${file}: node "${nodeId}" case "${when}" looks like a label, not an expression`,
                  ),
                )
                stats.warnings++
              }
            }
          }
        }
      }

      const newContent = serialize(doc as unknown as FlowprintDocument)

      if (opts.dryRun) {
        console.log(chalk.cyan(`  DIFF  ${file}`))
        printDiff(content, newContent)
      } else {
        writeFileSync(filePath, newContent, 'utf-8')
        console.log(chalk.green(`  MIGRATE  ${file}`))
      }

      stats.migrated++
    }

    // Print summary
    console.log('')
    console.log(
      chalk.bold('Summary: ') +
        `${String(stats.migrated)} migrated, ${String(stats.skipped)} skipped, ${String(stats.warnings)} warnings` +
        (stats.errors > 0 ? chalk.red(`, ${String(stats.errors)} errors`) : ''),
    )

    if (stats.errors > 0) {
      process.exit(1)
    }
    process.exit(0)
  })

function printDiff(oldText: string, newText: string): void {
  const oldLines = oldText.split('\n')
  const newLines = newText.split('\n')

  // Build LCS table for proper diff
  const lcs = computeLcs(oldLines, newLines)

  // Walk through both arrays using LCS to identify changes
  let oi = 0
  let ni = 0
  let li = 0

  while (oi < oldLines.length || ni < newLines.length) {
    const oldLine = oldLines[oi] ?? ''
    const newLine = newLines[ni] ?? ''
    const lcsLine = lcs[li]

    if (
      li < lcs.length &&
      oi < oldLines.length &&
      ni < newLines.length &&
      oldLine === lcsLine &&
      newLine === lcsLine
    ) {
      // Line is in LCS — unchanged
      console.log(chalk.dim(`  ${oldLine}`))
      oi++
      ni++
      li++
    } else {
      // Print all removed lines until we hit the next LCS line
      while (oi < oldLines.length && (li >= lcs.length || oldLines[oi] !== lcs[li])) {
        console.log(chalk.red(`- ${oldLines[oi] ?? ''}`))
        oi++
      }
      // Print all added lines until we hit the next LCS line
      while (ni < newLines.length && (li >= lcs.length || newLines[ni] !== lcs[li])) {
        console.log(chalk.green(`+ ${newLines[ni] ?? ''}`))
        ni++
      }
    }
  }
}

function computeLcs(a: string[], b: string[]): string[] {
  const m = a.length
  const n = b.length

  // Build DP table
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0))
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        const row = dp[i]
        if (row) row[j] = (dp[i - 1]?.[j - 1] ?? 0) + 1
      } else {
        const row = dp[i]
        if (row) row[j] = Math.max(dp[i - 1]?.[j] ?? 0, dp[i]?.[j - 1] ?? 0)
      }
    }
  }

  // Backtrack to find the LCS
  const result: string[] = []
  let i = m
  let j = n
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      const line = a[i - 1]
      if (line !== undefined) result.push(line)
      i--
      j--
    } else if ((dp[i - 1]?.[j] ?? 0) > (dp[i]?.[j - 1] ?? 0)) {
      i--
    } else {
      j--
    }
  }

  return result.reverse()
}
