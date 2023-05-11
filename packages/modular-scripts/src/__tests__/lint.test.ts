import * as path from 'path';
import * as fs from 'fs-extra';
import execa from 'execa';
import {
  createModularTestContext,
  runModularPipeLogs,
  runYarnModular,
} from '../test/utils';
import getModularRoot from '../utils/getModularRoot';

const modularRoot = getModularRoot();
const fixturesFolder = path.join(__dirname, '__fixtures__', 'lint');
const relativeFixturePath = fixturesFolder.replace(modularRoot, '');

// Temporary text context paths
let tempModularRepo: string;

function setupLintErrors(): string[] {
  tempModularRepo = createModularTestContext();
  const tempFixturesFolder = path.join(tempModularRepo, relativeFixturePath);
  fs.mkdirsSync(tempFixturesFolder);
  const files = fs.readdirSync(fixturesFolder);
  return files.map((file) => {
    fs.writeFileSync(
      path.join(tempFixturesFolder, file),
      fs
        .readFileSync(path.join(fixturesFolder, file), 'utf-8')
        .replace('/* eslint-disable */', '///'),
    );
    return path.join(tempFixturesFolder, file);
  });
}

describe('Modular lint', () => {
  let lintedFiles: string[];
  describe('when the codebase has linting errors', () => {
    beforeEach(() => {
      lintedFiles = setupLintErrors();
    });
    it('should print the eslint errors', async () => {
      let eslintLogs: string[] = [];
      try {
        await execa(
          'eslint',
          [
            'packages/modular-scripts/src/__tests__/__fixtures__/lint',
            '--ext',
            '.js,.jsx,.ts,.tsx',
            '--max-warnings',
            '0',
          ],
          {
            cwd: tempModularRepo,
            all: true,
            cleanup: true,
          },
        );
      } catch ({ stdout }) {
        eslintLogs = (stdout as string).split('\n').filter((l: string) => l);
      }
      let modularLogs: string[] = [];
      try {
        await runYarnModular(tempModularRepo, 'lint --regex __fixtures__/lint');
      } catch ({ stderr }) {
        modularLogs = (stderr as string).split('\n');
      }
      eslintLogs.forEach((el) => {
        expect(modularLogs.find((ml) => el.includes(ml))).toBeDefined();
      });
    });
    it('should not pass lint test', async () => {
      let modularLogs: string[] = [];
      try {
        await runYarnModular(tempModularRepo, 'lint --regex __fixtures__/lint');
      } catch ({ stderr }) {
        modularLogs = (stderr as string).split('\n');
      }
      expect(modularLogs).toContain(
        `Test Suites: ${lintedFiles.length} failed, ${lintedFiles.length} total`,
      );
      expect(modularLogs.filter((l) => l.startsWith('FAIL lint'))).toHaveLength(
        lintedFiles.length,
      );
    });
  });
  describe('when the codebase does not have lint errors', () => {
    it('should pass the lint tests', async () => {
      const files = fs.readdirSync(fixturesFolder);
      const result = await runYarnModular(
        modularRoot,
        'lint --regex __fixtures__/lint',
      );
      const modularLogs: string[] = result.stderr.split('\n');
      expect(modularLogs).toContain(
        `Test Suites: ${files.length} passed, ${files.length} total`,
      );
      expect(modularLogs.filter((l) => l.startsWith('PASS lint'))).toHaveLength(
        files.length,
      );
    });
  });
});

describe('lint command can successfully do selective tests based on selected packages', () => {
  const fixturesFolder = path.join(
    __dirname,
    Array.from({ length: 4 }).reduce<string>(
      (acc) => `${acc}..${path.sep}`,
      '',
    ),
    '__fixtures__',
    'selective-lint',
  );

  let randomOutputFolder: string;

  beforeAll(() => {
    // Create random dir
    randomOutputFolder = createModularTestContext();

    fs.copySync(fixturesFolder, randomOutputFolder);
    execa.sync('yarn', {
      cwd: randomOutputFolder,
    });
  });

  // Run in a single test, serially for performance reasons (the setup time is quite long)
  it('finds test after specifying a valid package', () => {
    const resultPackages = runModularPipeLogs(
      randomOutputFolder,
      'lint beta-lint gamma-lint',
      'true',
    );
    expect(resultPackages.stderr).toContain('packages/beta-lint/src/');
    expect(resultPackages.stderr).toContain('packages/gamma-lint/src/');
    expect(resultPackages.stderr).not.toContain('packages/alpha-lint/src/');
    expect(resultPackages.stderr).not.toContain('packages/delta-lint/src/');
    expect(resultPackages.stderr).not.toContain('packages/epsilon-lint/src/');
  });

  it('finds ancestors using --ancestors', () => {
    const resultPackagesWithAncestors = runModularPipeLogs(
      randomOutputFolder,
      'lint beta-lint gamma-lint --ancestors',
      'true',
    );
    expect(resultPackagesWithAncestors.stderr).toContain(
      'packages/gamma-lint/src/',
    );
    expect(resultPackagesWithAncestors.stderr).toContain(
      'packages/beta-lint/src/',
    );
    expect(resultPackagesWithAncestors.stderr).toContain(
      'packages/alpha-lint/src/',
    );
    expect(resultPackagesWithAncestors.stderr).toContain(
      'packages/epsilon-lint/src/',
    );
    expect(resultPackagesWithAncestors.stderr).not.toContain(
      'packages/delta-lint/src/',
    );
  });

  it('finds descendants using --descendants', () => {
    const resultPackagesWithDescendants = runModularPipeLogs(
      randomOutputFolder,
      'lint beta-lint gamma-lint --descendants',
      'true',
    );
    expect(resultPackagesWithDescendants.stderr).toContain(
      'packages/beta-lint/src/',
    );
    expect(resultPackagesWithDescendants.stderr).toContain(
      'packages/gamma-lint/src/',
    );
    expect(resultPackagesWithDescendants.stderr).toContain(
      'packages/delta-lint/src/',
    );
    expect(resultPackagesWithDescendants.stderr).not.toContain(
      'packages/alpha-lint/src/',
    );
    expect(resultPackagesWithDescendants.stderr).not.toContain(
      'packages/epsilon-lint/src/',
    );
  });

  it('finds all using no options', () => {
    const result = runModularPipeLogs(randomOutputFolder, 'lint', 'true');
    console.log('stdout: ', result.stdout);
    expect(result.stderr).toContain('packages/gamma-lint/src/');
    expect(result.stderr).toContain('packages/beta-lint/src/');
    expect(result.stderr).toContain('packages/alpha-lint/src/');
    expect(result.stderr).toContain('packages/epsilon-lint/src/');
    expect(result.stderr).toContain('packages/delta-lint/src/');
  });
});
