import { Command } from 'commander'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import chalk from 'chalk'
import { parse } from 'yaml'
import {
  migrate,
  serialize,
  CURRENT_VERSION,
} from '@ruminaider/flowprint-schema'
import type { FlowprintDocument } from '@ruminaider/flowprint-schema'

export const migrateCommand = new Command('migrate')
  .description('Migrate .flowprint.yaml files to the current schema version')
  .argument('<file>', 'Path to .flowprint.yaml file')
  .option('--dry-run', 'Show what would change without writing')
  .option('--output <path>', 'Write migrated output to a different file')
  .addHelpText(
    'after',
    '\nExit codes:\n  0  Already current or successfully migrated\n  1  Migration error\n  2  Future version (tool needs updating)',
  )
  .action(async (file: string, opts: { dryRun?: boolean; output?: string }) => {
    const filePath = resolve(file)
    let content: string
    try {
      content = readFileSync(filePath, 'utf-8')
    } catch {
      console.error(chalk.red(`File not found or unreadable: ${file}`))
      process.exit(1)
    }

    let doc: FlowprintDocument
    try {
      doc = parse(content) as FlowprintDocument
    } catch (err) {
      console.error(
        chalk.red(`Failed to parse YAML: ${err instanceof Error ? err.message : String(err)}`),
      )
      process.exit(1)
    }

    const result = migrate(doc)

    switch (result.status) {
      case 'current':
        console.log(chalk.green(`${file}: already at ${CURRENT_VERSION} (current)`))
        process.exit(0)
        break

      case 'future_version':
        console.error(
          chalk.yellow(
            `${file}: uses ${result.documentVersion}, but this tool only supports up to ${result.currentToolVersion}. Update your tool.`,
          ),
        )
        process.exit(2)
        break

      case 'error':
        console.error(chalk.red(`${file}: migration failed`))
        console.error(chalk.red(`  Rule: ${result.error.failedRule}`))
        console.error(chalk.red(`  Reason: ${result.error.reason}`))
        if (result.error.stepIndex >= 0) {
          console.error(chalk.red(`  Step index: ${result.error.stepIndex}`))
        }
        process.exit(1)
        break

      case 'migrated': {
        console.log(chalk.green(`${file}: migrated ${result.fromVersion} → ${result.toVersion}`))
        for (const entry of result.changelog.entries) {
          console.log(chalk.gray(`  ${entry.version}: ${entry.description}`))
        }
        if (opts.dryRun) {
          console.log(chalk.yellow('\n(dry run — no files written)'))
        } else {
          const yaml = serialize(result.doc)
          const outputPath = opts.output ? resolve(opts.output) : filePath
          writeFileSync(outputPath, yaml, 'utf-8')
          console.log(chalk.green(`  Written to: ${outputPath}`))
        }
        process.exit(0)
        break
      }
    }
  })
