import { Command } from 'commander'
import chalk from 'chalk'

export const migrateCommand = new Command('migrate')
  .description('Migrate .flowprint.yaml files to the latest schema version')
  .addHelpText('after', '\nExit codes:\n  0  Already at latest version')
  .action(() => {
    console.log(chalk.green('Already at latest version (flowprint/1.0).'))
    process.exit(0)
  })
