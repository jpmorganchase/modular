import * as path from 'path';
import rimraf from 'rimraf';
import * as fs from 'fs-extra';
import tree from 'tree-view-for-tests';
import stageView from '../../utils/stageView';
import getModularRoot from '../../utils/getModularRoot';

describe('stageView', () => {
  let testView = '';
  const modularRoot = getModularRoot();
  const tempDirPath = path.join(modularRoot, 'node_modules', '.modular');
  function cleanUpTempView(view: string) {
    rimraf.sync(path.join(tempDirPath, view));
  }
  afterEach(() => {
    cleanUpTempView(testView);
    testView = '';
  });
  afterAll(() => {
    cleanUpTempView('');
  });
  it('should create a temp app using the app type template', () => {
    testView = 'test-view';
    const testViewPath = path.join(tempDirPath, testView);
    stageView(testView);
    expect(tree(testViewPath)).toMatchInlineSnapshot(`
      "test-view
      ├─ package.json
      ├─ public
      │  └─ index.html #6bixo0
      ├─ src
      │  └─ index.tsx #yuzcqd
      └─ tsconfig.json #1ww9d44"
    `);
  });
  it('should import the view as the main app in index.tsx', () => {
    testView = 'test-view';
    const testViewPath = path.join(tempDirPath, testView);
    stageView(testView);
    const indexFile = fs
      .readFileSync(path.join(testViewPath, 'src', 'index.tsx'), 'utf-8')
      .toString();
    expect(indexFile).toContain(`import App from '${testView}'`);
  });
});
