import execa from 'execa';
import * as fs from 'fs-extra';
import * as tmp from 'tmp';
import tree from 'tree-view-for-tests';

// this can take a while...
jest.setTimeout(10 * 60 * 1000);

describe('Creating a new modular app via the CLI', () => {
  let cwd: string;
  beforeEach(async () => {
    cwd = tmp.dirSync().name;

    console.log('Using ', cwd);

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
    expect(tree(cwd).replace(cwd, 'new-modular-app')).toMatchSnapshot();
  });
});
