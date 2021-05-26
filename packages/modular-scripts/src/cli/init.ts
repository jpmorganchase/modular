import program from './program';
import { init } from '../';

interface Options {
  y: boolean;
}

const command = program
  .command('init')
  .description(
    `Initialize a new modular repository in the current working directory.`,
  )
  .option('-y', 'Equivalent of npm init -y when running modular init', false)
  .action((options: Options) => {
    return init(options.y);
  });

export default command;
