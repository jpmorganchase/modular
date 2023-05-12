import * as path from 'path';
import execa from 'execa';
import * as fs from 'fs-extra';
import * as tmp from 'tmp';
import { hashlessTree } from 'tree-view-for-tests';

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
    expect(hashlessTree(cwd)).toMatchSnapshot();
  });
});

describe('Creating a new modular app via the CLI with --empty', () => {
  let cwd: string;
  beforeEach(async () => {
    cwd = path.join(tmp.dirSync().name, 'another-new-modular-app');

    await execa('yarnpkg', ['create-modular-react-app', cwd, '--empty'], {
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
    expect(hashlessTree(cwd)).toMatchSnapshot();
  });
});
