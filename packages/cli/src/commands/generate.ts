import { Command } from 'commander'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve, join, dirname } from 'node:path'
import chalk from 'chalk'
import { parse } from 'yaml'
import { validateYaml } from '@ruminaider/flowprint-schema'
import type { FlowprintDocument } from '@ruminaider/flowprint-schema'

export const generateCommand = new Command('generate')
  .description('Generate Temporal TypeScript workflow from a flowprint document')
  .argument('<file>', 'Path to .flowprint.yaml file')
  .option('--output <dir>', 'Output directory', './generated')
  .action(async (file: string, opts: { output: string }) => {
    const filePath = resolve(file)

    let content: string
    try {
      content = readFileSync(filePath, 'utf-8')
    } catch {
      console.error(chalk.red(`File not found or unreadable: ${file}`))
      process.exit(2)
    }

    const validation = validateYaml(content)
    const errors = validation.errors.filter((e) => e.severity === 'error')
    if (errors.length > 0) {
      console.error(chalk.red(`Validation errors in ${file}:`))
      for (const err of errors) {
        console.error(chalk.red(`  ${err.path}: ${err.message}`))
      }
      process.exit(1)
    }

    const doc = parse(content) as FlowprintDocument

    const { generateCode } = await import('@ruminaider/flowprint-engine')
    const outputDir = resolve(opts.output)
    const result = generateCode(doc, {
      outputDir,
      flowName: doc.name,
    })

    mkdirSync(outputDir, { recursive: true })

    for (const generatedFile of result.files) {
      const outPath = join(outputDir, generatedFile.path)
      const dir = dirname(outPath)
      mkdirSync(dir, { recursive: true })
      writeFileSync(outPath, generatedFile.content, 'utf-8')
    }

    console.log(chalk.green(`Generated ${String(result.files.length)} files in ${opts.output}:`))
    for (const f of result.files) {
      console.log(chalk.gray(`  ${f.path}`))
    }
  })
