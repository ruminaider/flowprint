import { Command } from 'commander'
import { readFileSync } from 'node:fs'
import { resolve, dirname, basename } from 'node:path'
import chalk from 'chalk'
import { glob } from 'glob'

export const testCommand = new Command('test')
  .description('Run rules test files against their corresponding rules')
  .argument('[glob]', 'Glob pattern for test files', '**/*.rules.test.yaml')
  .addHelpText(
    'after',
    '\nNaming convention:\n' +
      '  foo.rules.test.yaml tests foo.rules.yaml\n' +
      '\nExit codes:\n  0  All tests passed\n  1  Test failures\n  2  File not found or parse error',
  )
  .action(async (pattern: string) => {
    // Lazy imports for fast CLI startup
    const { parse } = await import('yaml')
    const { validateRules, validateRulesTest } = await import('@ruminaider/flowprint-schema')
    const { runRulesTests } = await import('@ruminaider/flowprint-engine')

    const testFiles = await glob(pattern)

    if (testFiles.length === 0) {
      console.error(chalk.red(`No test files found matching pattern: ${pattern}`))
      process.exit(2)
    }

    let totalTests = 0
    let totalPassed = 0
    let totalFailed = 0
    let hasFileErrors = false

    for (const testFile of testFiles.sort()) {
      // Derive rules file path: foo.rules.test.yaml -> foo.rules.yaml
      const dir = dirname(testFile)
      const base = basename(testFile)
      const rulesBase = base.replace('.rules.test.yaml', '.rules.yaml')
      const rulesFile = resolve(dir, rulesBase)
      const testFilePath = resolve(testFile)

      // Load test file
      let testContent: string
      try {
        testContent = readFileSync(testFilePath, 'utf-8')
      } catch {
        console.error(chalk.red(`  Cannot read test file: ${testFile}`))
        hasFileErrors = true
        continue
      }

      let testDoc: unknown
      try {
        testDoc = parse(testContent)
      } catch {
        console.error(chalk.red(`  Failed to parse YAML: ${testFile}`))
        hasFileErrors = true
        continue
      }

      // Validate test file schema
      const testValidation = validateRulesTest(testDoc)
      if (!testValidation.valid) {
        console.error(chalk.red(`  Invalid test file: ${testFile}`))
        for (const err of testValidation.errors) {
          console.error(chalk.red(`    ${err.path}: ${err.message}`))
        }
        hasFileErrors = true
        continue
      }

      // Load rules file
      let rulesContent: string
      try {
        rulesContent = readFileSync(rulesFile, 'utf-8')
      } catch {
        console.error(chalk.red(`  Rules file not found: ${rulesBase} (expected by ${testFile})`))
        hasFileErrors = true
        continue
      }

      let rulesDoc: unknown
      try {
        rulesDoc = parse(rulesContent)
      } catch {
        console.error(chalk.red(`  Failed to parse rules file: ${rulesBase}`))
        hasFileErrors = true
        continue
      }

      // Validate rules file schema
      const rulesValidation = validateRules(rulesDoc)
      const rulesErrors = rulesValidation.errors.filter((e) => e.severity === 'error')
      if (rulesErrors.length > 0) {
        console.error(chalk.red(`  Invalid rules file: ${rulesBase}`))
        for (const err of rulesErrors) {
          console.error(chalk.red(`    ${err.path}: ${err.message}`))
        }
        hasFileErrors = true
        continue
      }

      // Run tests
      const typedTestDoc = testDoc as { tests: Array<{ name: string; input: Record<string, unknown>; expected_output?: Record<string, unknown>; expected_matched_count?: number }> }
      const results = runRulesTests(
        rulesDoc as Parameters<typeof runRulesTests>[0],
        typedTestDoc.tests,
      )

      // Report results
      const passed = results.filter((r) => r.passed).length
      const failed = results.filter((r) => !r.passed).length
      totalTests += results.length
      totalPassed += passed
      totalFailed += failed

      if (failed > 0) {
        console.log(chalk.red(`  FAIL  ${testFile}`))
      } else {
        console.log(chalk.green(`  PASS  ${testFile}`))
      }

      for (const result of results) {
        if (result.passed) {
          console.log(chalk.green(`    ✓ ${result.name}`))
        } else {
          console.log(chalk.red(`    ✗ ${result.name}`))
          for (const err of result.errors) {
            console.log(chalk.red(`      ${err}`))
          }
        }
      }
    }

    // Summary
    console.log('')
    if (totalFailed > 0) {
      console.log(
        chalk.red(`${String(totalFailed)} failed`) +
          `, ${String(totalPassed)} passed, ${String(totalTests)} total`,
      )
    } else {
      console.log(
        chalk.green(`${String(totalPassed)} passed`) + `, ${String(totalTests)} total`,
      )
    }

    if (hasFileErrors) {
      process.exit(2)
    }
    if (totalFailed > 0) {
      process.exit(1)
    }
  })
