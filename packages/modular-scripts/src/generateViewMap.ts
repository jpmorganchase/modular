import * as fs from 'fs-extra';
import * as path from 'path';

import type { PackageJson } from './cli';

// Given a directory of views, generate a map like:
// { 'package-name': lazy(() => import('package-name')) }
export function generateViewMap(viewsDirectoryPath: string): string {
  const packageNames = fs
    .readdirSync(viewsDirectoryPath, { withFileTypes: true })
    // Get individual view directories.
    .filter((entry) => entry.isDirectory())
    // Get view `package.json`s.
    .map(
      (dir) =>
        fs.readJSONSync(
          path.join(viewsDirectoryPath, dir.name, 'package.json'),
        ) as PackageJson,
    )
    // only chose the ones explicitly marked as views
    .filter((packageJson) => packageJson.modular?.type === 'view')
    // Remove views which are marked as private (and therefore are not published yet.)
    .filter((packageJson) => packageJson.private !== true)
    // Get package names.
    .map((packageJson) => packageJson.name);

  return `{
  ${packageNames
    .map(
      (packageName) => `'${packageName}': lazy(() => import('${packageName}'))`,
    )
    .join(',\n  ')}
}`;
}
