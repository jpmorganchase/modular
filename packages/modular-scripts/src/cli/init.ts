import { Command } from 'commander';
import { init } from '../';

interface Options {
  y: boolean;
}

const command = new Command('init')
  .description(
    `Initialize a new modular repository in the current working directory.`,
  )
  .option('-y', 'Equivalent of npm init -y when running modular init', false)
  .action((options: Options) => {
    return init(options.y);
  });

export default command;
