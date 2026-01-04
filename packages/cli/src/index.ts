import { Command } from 'commander'
import { validateCommand } from './commands/validate.js'
import { lintCommand } from './commands/lint.js'
import { diffCommand } from './commands/diff.js'
import { migrateCommand } from './commands/migrate.js'
import { initCommand } from './commands/init.js'

const program = new Command()

program
  .name('flowprint')
  .description('CLI for validating, linting, and diffing Flowprint service blueprints')
  .version('0.0.0')
  .addHelpText(
    'after',
    '\nExit codes:\n  0  Success\n  1  Validation/lint errors found\n  2  File not found or parse error',
  )

program.addCommand(validateCommand)
program.addCommand(lintCommand)
program.addCommand(diffCommand)
program.addCommand(migrateCommand)
program.addCommand(initCommand)

program.parse()
