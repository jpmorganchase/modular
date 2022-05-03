import * as fs from 'fs-extra';
import path from 'path';
import { pascalCase as toPascalCase } from 'change-case';
import getModularRoot from './getModularRoot';

export default function stageView(targetedView: string): string {
  const modularRoot = getModularRoot();

  const tempDir = path.join(modularRoot, 'node_modules', '.modular');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
  }
  const stagedViewAppPath = path.join(tempDir, targetedView);

  const name = toPascalCase(targetedView);

  const workingDirectory = path.join(tempDir, targetedView);

  fs.mkdirpSync(workingDirectory);
  fs.mkdirpSync(path.join(workingDirectory, 'public'));
  fs.mkdirpSync(path.join(workingDirectory, 'src'));

  fs.writeJsonSync(path.join(workingDirectory, 'package.json'), {
    modular: {
      type: 'app',
    },
    name,
    version: '1.0.0',
  });

  fs.writeFileSync(
    path.join(workingDirectory, 'public', 'index.html'),
    `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <title>{name}</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
  `,
  );

  const indexTemplate = `import * as React from 'react';
  import * as ReactDOM from 'react-dom';
  
  import App from '${targetedView}';
  
  ReactDOM.render(
    <App />,
    document.getElementById('root'),
  );`;

  fs.writeFileSync(
    path.join(stagedViewAppPath, 'src', 'index.tsx'),
    indexTemplate,
  );
  fs.writeJSONSync(
    path.join(stagedViewAppPath, 'tsconfig.json'),
    {
      extends: path.relative(stagedViewAppPath, modularRoot) + '/tsconfig.json',
    },
    { spaces: 2 },
  );
  return stagedViewAppPath;
}
