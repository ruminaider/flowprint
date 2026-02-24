import { Command } from 'commander'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import chalk from 'chalk'
import { glob } from 'glob'
import { parse } from 'yaml'
import { validateYaml, validateRulesYaml } from '@ruminaider/flowprint-schema'
import type { FlowprintDocument, ValidationError } from '@ruminaider/flowprint-schema'
import { checkEntryPoints } from '../entry-points.js'

export const validateCommand = new Command('validate')
  .description('Validate .flowprint.yaml files against the schema')
  .argument('<glob>', 'Glob pattern matching .flowprint.yaml files')
  .option(
    '--check-entry-points',
    'Verify referenced files exist and entry point symbols are defined',
  )
  .option('--executable', 'Validate expression syntax and data flow for execution')
  .addHelpText(
    'after',
    '\nExit codes:\n  0  All files valid\n  1  Validation errors found\n  2  File not found or parse error',
  )
  .action(async (pattern: string, opts: { checkEntryPoints?: boolean; executable?: boolean }) => {
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

      if (opts.executable && result.valid) {
        const { validateExpressions } = await import('@ruminaider/flowprint-engine')
        const doc = parse(content) as FlowprintDocument
        const exprResult = validateExpressions(doc)
        if (!exprResult.valid) {
          hasErrors = true
          console.log(chalk.red(`  EXEC  ${file}`))
          for (const err of exprResult.errors) {
            console.log(chalk.red(`    ${err.path}: ${err.message}`))
          }
        }
      }

      // Validate referenced rules files
      if (result.valid) {
        const doc = parse(content) as FlowprintDocument
        for (const [nodeId, node] of Object.entries(doc.nodes)) {
          if ('rules' in node && node.rules?.file) {
            const rulesPath = resolve(dirname(filePath), node.rules.file)
            let rulesContent: string
            try {
              rulesContent = readFileSync(rulesPath, 'utf-8')
            } catch {
              hasErrors = true
              console.log(
                chalk.red(
                  `  RULES ${file} -> ${node.rules.file} (node: ${nodeId}): file not found`,
                ),
              )
              continue
            }
            const rulesResult = validateRulesYaml(rulesContent)
            const rulesErrors = rulesResult.errors.filter((e) => e.severity === 'error')
            const rulesWarnings = rulesResult.errors.filter((e) => e.severity === 'warning')
            if (rulesErrors.length > 0) {
              hasErrors = true
              console.log(
                chalk.red(`  RULES ${file} -> ${node.rules.file} (node: ${nodeId})`),
              )
              for (const err of rulesErrors) {
                console.log(chalk.red(`    ${err.path}: ${err.message}`))
              }
            } else if (rulesWarnings.length > 0) {
              console.log(
                chalk.yellow(`  RULES ${file} -> ${node.rules.file} (node: ${nodeId})`),
              )
              for (const warn of rulesWarnings) {
                console.log(chalk.yellow(`    ${warn.path}: ${warn.message}`))
              }
            }
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
