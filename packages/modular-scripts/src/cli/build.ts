import { Command } from 'commander';
import { build } from '../';

const command = new Command('build <packages...>')
  .description(
    'Build a list of packages (multiple package names can be supplied separated by space)',
  )
  .option('--preserve-modules')
  .action(
    async (
      packagePaths: string[],
      options: {
        preserveModules?: boolean;
      },
    ) => {
      console.log('building packages at:', packagePaths.join(', '));

      for (let i = 0; i < packagePaths.length; i++) {
        try {
          await build(packagePaths[i], options['preserveModules']);
        } catch (err) {
          console.error(`building ${packagePaths[i]} failed`);
          throw err;
        }
      }
    },
  );

export default command;
