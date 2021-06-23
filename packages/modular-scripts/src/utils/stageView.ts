import * as fs from 'fs-extra';
import path from 'path';
import { pascalCase as toPascalCase } from 'change-case';
import getAllFiles from './getAllFiles';

export default function stageView(
  modularRoot: string,
  targetedView: string,
): string {
  const appTypePath = path.join(__dirname, '../../types', 'app');
  const indexTemplate = `import * as React from 'react';
import * as ReactDOM from 'react-dom';

import App from '${targetedView}';

ReactDOM.render(
  <App />,
  document.getElementById('root'),
);`;
  const tempDir = path.join(__dirname, '..', 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
  }
  const stagedViewAppPath = path.join(tempDir, targetedView);
  if (!fs.existsSync(`${tempDir}/${targetedView}`)) {
    fs.mkdirSync(`${tempDir}/${targetedView}`);
    fs.copySync(appTypePath, stagedViewAppPath);
  }

  const packageFilePaths = getAllFiles(stagedViewAppPath);

  for (const packageFilePath of packageFilePaths) {
    fs.writeFileSync(
      packageFilePath,
      fs
        .readFileSync(packageFilePath, 'utf8')
        .replace(/PackageName__/g, toPascalCase(targetedView))
        .replace(/ComponentName__/g, toPascalCase(targetedView)),
    );
    if (path.basename(packageFilePath) === 'packagejson') {
      fs.moveSync(
        packageFilePath,
        packageFilePath.replace('packagejson', 'package.json'),
      );
    }
  }

  if (!fs.existsSync(path.join(stagedViewAppPath, 'tsconfig.json'))) {
    fs.writeFileSync(
      path.join(stagedViewAppPath, 'src', 'index.tsx'),
      indexTemplate,
    );
    fs.writeJSONSync(
      path.join(stagedViewAppPath, 'tsconfig.json'),
      {
        extends:
          path.relative(stagedViewAppPath, modularRoot) + '/tsconfig.json',
      },
      { spaces: 2 },
    );
  }
  return stagedViewAppPath;
}
