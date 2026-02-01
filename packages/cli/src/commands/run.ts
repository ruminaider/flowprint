import { Command } from 'commander'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import chalk from 'chalk'

export const runCommand = new Command('run')
  .description('Execute a flowprint/2.0 document using the dev runner')
  .argument('<file>', 'Path to .flowprint.yaml file')
  .option('--input <json>', 'Workflow input as JSON string', '{}')
  .option('--fixtures <path>', 'Path to JSON fixtures file for wait nodes')
  .option('--json', 'Output structured JSON trace')
  .option('--expression-timeout <ms>', 'Expression evaluation timeout in ms', '1000')
  .addHelpText(
    'after',
    '\nExit codes:\n  0  Success\n  1  Execution failure\n  2  File not found or parse error',
  )
  .action(
    async (
      file: string,
      opts: {
        input: string
        fixtures?: string
        json?: boolean
        expressionTimeout: string
      },
    ) => {
      // Lazy imports for fast CLI startup
      const { parse } = await import('yaml')
      const { validateYaml } = await import('@ruminaider/flowprint-schema')
      const { validateExpressions, runGraph, formatTrace, loadFixtures } =
        await import('@ruminaider/flowprint-engine')

      const filePath = resolve(file)
      let content: string

      try {
        content = readFileSync(filePath, 'utf-8')
      } catch {
        console.error(chalk.red(`File not found or unreadable: ${file}`))
        process.exit(2)
      }

      // Validate schema
      const schemaResult = validateYaml(content)
      if (!schemaResult.valid) {
        console.error(chalk.red('Schema validation failed:'))
        for (const err of schemaResult.errors) {
          console.error(chalk.red(`  ${err.path}: ${err.message}`))
        }
        process.exit(2)
      }

      const doc = parse(content) as import('@ruminaider/flowprint-schema').FlowprintDocument

      // Validate expressions
      const exprResult = validateExpressions(doc)
      if (!exprResult.valid) {
        console.error(chalk.red('Expression validation failed:'))
        for (const err of exprResult.errors) {
          console.error(chalk.red(`  ${err.path}: ${err.message}`))
        }
        process.exit(2)
      }

      // Parse input JSON
      let input: unknown
      try {
        input = JSON.parse(opts.input)
      } catch {
        console.error(chalk.red('Invalid JSON for --input option'))
        process.exit(2)
      }

      // Load fixtures if provided
      let fixtures: Record<string, unknown> | undefined
      if (opts.fixtures) {
        try {
          fixtures = await loadFixtures(opts.fixtures)
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err)
          console.error(chalk.red(`Failed to load fixtures: ${message}`))
          process.exit(2)
        }
      }

      // Execute the graph
      const trace = await runGraph(doc, {
        input,
        projectRoot: dirname(filePath),
        fixtures,
        expressionTimeout: Number(opts.expressionTimeout),
        json: opts.json,
      })

      // Format and print trace
      const output = formatTrace(trace, opts.json ?? false)
      console.log(output)

      // Exit with appropriate code
      if (trace.status === 'error') {
        process.exit(1)
      } else if (trace.status === 'failure') {
        process.exit(1)
      }
    },
  )
