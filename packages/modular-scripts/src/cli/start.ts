import { Command } from 'commander';
import { start } from '../';

const command = new Command('start <packageName>')
  .description(
    `Start a dev-server for an app. Only available for modular 'app' types.`,
  )
  .action((packageName: string) => {
    return start(packageName);
  });
export default command;
