import * as fs from 'fs-extra';
import * as path from 'path';
import getAllFiles from '../../utils/getAllFiles';
import rimraf from 'rimraf';

describe('getAllFiles', () => {
  const testFiles = ['foo', 'bar', 'nested'];
  const testDir = path.join(__dirname, 'test-dir');
  function createTestDir() {
    fs.mkdirSync(testDir);
    testFiles.forEach((file) => {
      fs.createFileSync(path.join(testDir, file));
    });
  }
  function createNestedTestDir() {
    fs.mkdirSync(testDir);
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
  function cleanUpTestDir() {
    rimraf.sync(testDir);
  }

  afterAll(() => {
    cleanUpTestDir();
  });

  describe('when it is a flat directory', () => {
    beforeEach(() => {
      createTestDir();
    });
    afterEach(() => {
      cleanUpTestDir();
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
    afterEach(() => {
      cleanUpTestDir();
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
