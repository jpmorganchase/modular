import * as fs from 'fs-extra';
import * as path from 'path';

interface PackageJson {
  name: string;
  private?: boolean;
}

// Given a directory of widgets, generate a map like:
// { 'package-name': lazy(() => import('package-name')) }
export function generateWidgetMap(widgetsDirectoryPath: string): string {
  const packageNames = fs
    .readdirSync(widgetsDirectoryPath, { withFileTypes: true })
    // Get individual widget directories.
    .filter((entry) => entry.isDirectory())
    // Get widget `package.json`s.
    .map(
      (dir) =>
        fs.readJSONSync(
          path.join(widgetsDirectoryPath, dir.name, 'package.json'),
        ) as PackageJson,
    )
    // only chose the ones explicitly marked as widgets
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment,
    // @ts-ignore
    .filter((packageJson) => packageJson.widget === true)
    // Remove widgets which are marked as private (and therefore are not published yet.)
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
