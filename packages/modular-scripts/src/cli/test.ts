import program from './program';
import { test, TestOptions } from '../';

interface JestOption {
  default?: boolean | string;
  description: string;
  type: 'boolean' | 'string';
}
type JestOptions = Record<string, JestOption>;

const testOptions =
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  (require('jest-cli/build/cli/args.js') as { options: JestOptions }).options;

interface CLITestOptions extends TestOptions {
  U: boolean;
}

const command = program
  .command('test [regexes...]')
  .option(
    '--debug',
    'Setup node.js debugger on the test process - equivalent of setting --inspect-brk on a node.js process',
    false,
  )
  .option('--coverage', testOptions.coverage.description)
  .option('--forceExit', testOptions.forceExit.description)
  .option('--env <env>', testOptions.env.description, 'jsdom')
  .option('--maxWorkers <workers>', testOptions.maxWorkers.description)
  .option('--onlyChanged', testOptions.onlyChanged.description)
  .option('--json', testOptions.json.description)
  .option('--outputFile <file>', testOptions.outputFile.description)
  .option('--reporters <reporters...>', testOptions.reporters.description)
  .option('--runInBand', testOptions.runInBand.description)
  .option('--silent', testOptions.silent.description)
  .option('--showConfig', testOptions.showConfig.description)
  .option(
    '--testResultsProcessor <reporter>',
    testOptions.testResultsProcessor.description,
  )
  .option('--updateSnapshot, -u', testOptions.updateSnapshot.description)
  .option('--verbose', testOptions.verbose.description)
  .option('--watch', testOptions.watch.description)
  .option(
    '--watchAll [value]',
    testOptions.watchAll.description,
    !process.env.CI,
  )
  .description('Run tests over the codebase')
  .action((regexes: string[], options: CLITestOptions) => {
    const { U, ...testOptions } = options;

    // proxy simplified options to testOptions;
    testOptions.updateSnapshot = !!(options.updateSnapshot || U);

    return test(testOptions, regexes);
  });

export default command;
