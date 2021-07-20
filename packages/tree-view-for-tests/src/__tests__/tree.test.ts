import * as path from 'path';
import * as fs from 'fs-extra';
import rimraf from 'rimraf';
import tree from '../index';

const testDir = 'tree-test';

beforeEach(() => {
  fs.mkdirSync(path.join(__dirname, testDir));
  const files = ['foo.js', 'bar.js'];
  files.forEach((file: string) =>
    fs.createFileSync(path.join(__dirname, testDir, file)),
  );
});

afterEach(() => {
  rimraf.sync(path.join(__dirname, testDir));
});

test('it can serialise a folder', () => {
  // this needs to be a folder that doesn't change during tests,
  // so can't include any .test.ts files that actually use this.
  // I picked one of our packages instead.
  expect(tree(path.join(__dirname, testDir))).toMatchInlineSnapshot(`
    "tree-test
    ├─ bar.js #0
    └─ foo.js #0"
  `);
});
