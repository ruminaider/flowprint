import { Command } from 'commander'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import chalk from 'chalk'
import { glob } from 'glob'
import { validateYaml } from '@ruminaider/flowprint-schema'
import type { ValidationError } from '@ruminaider/flowprint-schema'
import { checkEntryPoints } from '../entry-points.js'

export const validateCommand = new Command('validate')
  .description('Validate .flowprint.yaml files against the schema')
  .argument('<glob>', 'Glob pattern matching .flowprint.yaml files')
  .option('--check-entry-points', 'Verify referenced files exist and entry point symbols are defined')
  .addHelpText(
    'after',
    '\nExit codes:\n  0  All files valid\n  1  Validation errors found\n  2  File not found or parse error',
  )
  .action(async (pattern: string, opts: { checkEntryPoints?: boolean }) => {
    const files = await glob(pattern)

    if (files.length === 0) {
      console.error(chalk.red(`No files found matching pattern: ${pattern}`))
      process.exit(2)
    }

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

      const result = validateYaml(content)
      const errors = result.errors.filter((e) => e.severity === 'error')
      const warnings = result.errors.filter((e) => e.severity === 'warning')

      if (errors.length > 0) {
        hasErrors = true
        console.log(chalk.red(`  FAIL  ${file}`))
        printErrors(errors)
        printWarnings(warnings)
      } else if (warnings.length > 0) {
        console.log(chalk.yellow(`  WARN  ${file}`))
        printWarnings(warnings)
      } else {
        console.log(chalk.green(`  PASS  ${file}`))
      }

      if (opts.checkEntryPoints && result.valid) {
        const epWarnings = await checkEntryPoints(content, filePath)
        if (epWarnings.length > 0) {
          for (const warning of epWarnings) {
            console.log(chalk.yellow(`    ⚠ ${warning}`))
          }
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

function printErrors(errors: ValidationError[]): void {
  for (const err of errors) {
    console.log(chalk.red(`    ${err.path}: ${err.message}`))
  }
}

function printWarnings(warnings: ValidationError[]): void {
  for (const warn of warnings) {
    console.log(chalk.yellow(`    ${warn.path}: ${warn.message}`))
  }
}
