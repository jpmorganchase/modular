import * as fs from 'fs-extra';
import path from 'path';
import { pascalCase as toPascalCase } from 'change-case';

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  const files = fs.readdirSync(dirPath);

  files.forEach(function (file) {
    const pathToCheck = path.join(dirPath, file);
    if (fs.statSync(pathToCheck).isDirectory()) {
      arrayOfFiles = getAllFiles(pathToCheck, arrayOfFiles);
    } else {
      arrayOfFiles.push(pathToCheck);
    }
  });

  return arrayOfFiles;
}

export default async function stageView(
  modularRoot: string,
  packagesRoot: string,
  targetedView: string,
): Promise<boolean> {
  const appTypePath = path.join(__dirname, '../../types', 'app');
  const indexTemplate = `import * as React from 'react';\n
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
      // we've named package.json as packagejson in these templates
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
    await fs.writeJSON(
      path.join(stagedViewAppPath, 'tsconfig.json'),
      {
        extends:
          path.relative(stagedViewAppPath, modularRoot) + '/tsconfig.json',
      },
      { spaces: 2 },
    );
  }
  return true;
}
