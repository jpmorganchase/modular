import execa from 'execa';
import * as path from 'path';
import * as fs from 'fs-extra';
import tree from 'tree-view-for-tests';

// this can take a while...
jest.setTimeout(10 * 60 * 1000);

describe('Creating a new modular app via the CLI', () => {
  let cwd: string;
  beforeEach(async () => {
    cwd = path.join(__dirname, '..', '..', 'new-modular-app');

    await fs.remove(cwd);

    await execa('yarnpkg', ['create-modular-react-app', 'new-modular-app'], {
      cwd: __dirname,
      cleanup: true,
      stderr: process.stderr,
      stdout: process.stdout,
    });
  });

  afterEach(async () => {
    await fs.remove(cwd);
  });

  it('should create the right tree', () => {
    expect(tree(cwd)).toMatchSnapshot();
  });
});
