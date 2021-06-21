import rimraf from 'rimraf';
import * as path from 'path';
import * as fs from 'fs-extra';
import stageView from '../../utils/stageView';
import getModularRoot from '../../utils/getModularRoot';
import tree from 'tree-view-for-tests';

describe('stageView', () => {
  let testView = '';
  const tempDirPath = path.join(__dirname, '../..', 'temp');
  const modularRoot = getModularRoot();
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
    stageView(modularRoot, testView);
    expect(tree(testViewPath)).toMatchInlineSnapshot(`
      "test-view
      ├─ package.json
      ├─ public
      │  ├─ favicon.ico #6pu3rg
      │  ├─ index.html #1wohq3p
      │  ├─ logo192.png #1nez7vk
      │  ├─ logo512.png #1hwqvcc
      │  ├─ manifest.json #19gah8o
      │  └─ robots.txt #1sjb8b3
      ├─ src
      │  ├─ App.css #1o0zosm
      │  ├─ App.tsx #c80ven
      │  ├─ __tests__
      │  │  └─ App.test.tsx #16urcos
      │  ├─ index.css #o7sk21
      │  ├─ index.tsx #1qbgs9s
      │  ├─ logo.svg #1okqmlj
      │  └─ react-app-env.d.ts #1dm2mq6
      └─ tsconfig.json #ns1qls"
    `);
  });
  it('should import the view as the main app in index.tsx', () => {
    testView = 'test-view';
    const testViewPath = path.join(tempDirPath, testView);
    stageView(modularRoot, testView);
    const indexFile = fs
      .readFileSync(path.join(testViewPath, 'src', 'index.tsx'), 'utf-8')
      .toString();
    expect(indexFile).toContain(`import App from '${testView}'`);
  });
});
