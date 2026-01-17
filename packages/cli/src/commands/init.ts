import { Command } from 'commander'
import { writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import chalk from 'chalk'
import { serialize } from '@ruminaider/flowprint-schema'
import type { FlowprintDocument } from '@ruminaider/flowprint-schema'

export const initCommand = new Command('init')
  .description('Create a starter .flowprint.yaml blueprint')
  .argument('[name]', 'Blueprint name (defaults to interactive prompt)')
  .option('--non-interactive', 'Skip interactive prompts and use defaults')
  .option('-o, --output <path>', 'Output file path')
  .addHelpText('after', '\nExit codes:\n  0  Blueprint created successfully')
  .action(async (name?: string, opts?: { nonInteractive?: boolean; output?: string }) => {
    let blueprintName: string
    let frontstageName = 'frontstage'
    let backstageName = 'backstage'

    if (name) {
      blueprintName = name
    } else if (opts?.nonInteractive) {
      blueprintName = 'my-blueprint'
    } else {
      try {
        const { input, confirm } = await import('@inquirer/prompts')
        blueprintName = await input({
          message: 'Blueprint name:',
          default: 'my-blueprint',
          validate: (v) =>
            /^[a-z][a-z0-9-]*$/.test(v) ? true : 'Use lowercase letters, numbers, and hyphens',
        })

        const customizeLanes = await confirm({
          message: 'Customize lane names?',
          default: false,
        })

        if (customizeLanes) {
          frontstageName = await input({
            message: 'External (frontstage) lane ID:',
            default: 'frontstage',
          })
          backstageName = await input({
            message: 'Internal (backstage) lane ID:',
            default: 'backstage',
          })
        }
      } catch {
        // User cancelled (Ctrl+C)
        process.exit(0)
      }
    }

    const doc: FlowprintDocument = {
      schema: 'flowprint/1.0',
      name: blueprintName,
      version: '1.0.0',
      description: `${blueprintName} service blueprint`,
      lanes: {
        [frontstageName]: {
          label: capitalize(frontstageName),
          visibility: 'external',
          order: 0,
        },
        [backstageName]: {
          label: capitalize(backstageName),
          visibility: 'internal',
          order: 1,
        },
      },
      nodes: {
        start_action: {
          type: 'action',
          lane: frontstageName,
          label: 'Start Action',
          description: 'Initial action in the blueprint',
          next: 'end_success',
        },
        end_success: {
          type: 'terminal',
          lane: frontstageName,
          label: 'Success',
          outcome: 'success',
        },
      },
    }

    const yaml = serialize(doc)
    const outputPath = resolve(opts?.output ?? `${blueprintName}.flowprint.yaml`)

    if (existsSync(outputPath)) {
      console.error(chalk.red(`File already exists: ${outputPath}`))
      process.exit(2)
    }

    writeFileSync(outputPath, yaml, 'utf-8')
    console.log(chalk.green(`Created ${outputPath}`))
    process.exit(0)
  })

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
