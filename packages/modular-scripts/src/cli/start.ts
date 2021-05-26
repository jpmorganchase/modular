import program from './program';
import { start } from '../';

const command = program
  .command('start <packageName>')
  .description(
    `Start a dev-server for an app. Only available for modular 'app' types.`,
  )
  .action((packageName: string) => {
    return start(packageName);
  });
export default command;
