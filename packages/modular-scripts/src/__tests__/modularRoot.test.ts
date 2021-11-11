import * as fs from 'fs-extra';
import * as tmp from 'tmp';
import { promisify } from 'util';
import getModularRoot, { findModularRoot } from '../utils/getModularRoot';
const mktempd = promisify(tmp.dir);

describe('findModularRoot and getModularRoot', () => {
  const cwd = process.cwd();
  let folder: string;
  beforeEach(async () => {
    folder = await mktempd();
    process.chdir(folder);
  });

  afterEach(async () => {
    process.chdir(cwd);
    await fs.remove(folder);
  });

  it("When findModularRoot doesn't find a root in a temp directory it returns undefined and doesn't except", () => {
    let modularRoot: string | undefined = 'truthy';

    function findWrapper() {
      modularRoot = findModularRoot();
    }

    expect(findWrapper).not.toThrow();
    expect(modularRoot).toBeUndefined();
  });

  it("When getModularRoot doesn't find a root in a temp directory, it excepts", () => {
    function findWrapper() {
      getModularRoot();
    }

    expect(findWrapper).toThrow();
  });
});
