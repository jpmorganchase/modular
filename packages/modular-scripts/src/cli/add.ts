import { Command } from 'commander';
import { addPackage } from '../';

const command = new Command('add <package-name>')
  .description(`Add a new folder into the modular workspace.`)
  .option(
    '--unstable-type <type>',
    "Type of the folder ('app', 'view', 'package')",
  )
  .option('--unstable-name <name>', 'Package name for the package.json')
  .action(
    (
      packageName: string,
      addOptions: {
        unstableType?: string;
        unstableName?: string;
      },
    ) => {
      return addPackage(
        packageName,
        addOptions['unstableType'],
        addOptions['unstableName'],
      );
    },
  );

export default command;
