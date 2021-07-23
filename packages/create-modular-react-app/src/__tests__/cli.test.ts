import execa from 'execa';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as tmp from 'tmp';
import tree from 'tree-view-for-tests';

describe('Creating a new modular app via the CLI', () => {
  let cwd: string;
  beforeEach(async () => {
    cwd = path.join(tmp.dirSync().name, 'new-modular-app');

    await execa('yarnpkg', ['create-modular-react-app', cwd], {
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
