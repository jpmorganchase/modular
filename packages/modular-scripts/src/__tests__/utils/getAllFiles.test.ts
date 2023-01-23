import * as fs from 'fs-extra';
import * as path from 'path';
import getAllFiles from '../../utils/getAllFiles';
import * as tmp from 'tmp';

describe('getAllFiles', () => {
  const testFiles = ['foo', 'bar', 'nested'];
  let testDir: string;
  function createTestDir() {
    testDir = tmp.dirSync({ unsafeCleanup: true }).name;
    testFiles.forEach((file) => {
      fs.createFileSync(path.join(testDir, file));
    });
  }
  function createNestedTestDir() {
    testDir = tmp.dirSync({ unsafeCleanup: true }).name;
    testFiles.forEach((file, i) => {
      if (file === 'nested') {
        const nestedFile = 'nested/bazz';
        testFiles[i] = nestedFile;
        fs.mkdirSync(path.join(testDir, file));
        return fs.createFileSync(path.join(testDir, nestedFile));
      }
      return fs.createFileSync(path.join(testDir, file));
    });
  }

  describe('when it is a flat directory', () => {
    beforeEach(() => {
      createTestDir();
    });

    it('should return a flat array of file paths', () => {
      const expected = testFiles.map((file) =>
        path.resolve(path.join(testDir, file)),
      );
      const allFiles = getAllFiles(testDir);
      expected.forEach((path) => {
        expect(allFiles).toContain(path);
      });
    });
  });
  describe('when there are nested files', () => {
    beforeEach(() => {
      createNestedTestDir();
    });
    it('should return a flat array of file paths', () => {
      const expected = testFiles.map((file) =>
        path.resolve(path.join(testDir, file)),
      );
      const allFiles = getAllFiles(testDir);
      expected.forEach((path) => {
        expect(allFiles).toContain(path);
      });
    });
  });
});
