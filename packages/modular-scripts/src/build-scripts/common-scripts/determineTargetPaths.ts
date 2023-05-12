import * as path from 'path';
import { paramCase as toParamCase } from 'change-case';
import fs from 'fs-extra';
import globby from 'globby';
import getPublicUrlOrPath from './getPublicUrlOrPath';
import getModularRoot from '../../utils/getModularRoot';
import { getConfig } from '../../utils/config';
export interface Paths {
  modularRoot: string;
  publicUrlOrPath: string;
  dotenv: string;
  appPath: string;
  appBuild: string;
  appPublic: string;
  appHtml: string;
  appIndexJs: string;
  appPackageJson: string;
  appSrc: string;
  appTsConfig: string;
  appJsConfig: string;
  testsSetup: string;
  proxySetup: string;
  appNodeModules: string;
  ownNodeModules: string;
  appTypeDeclarations: string;
  ownTypeDeclarations: string;
  moduleFileExtensions: string[];
  includeDirectories: string[];
}

/**
 * Provided a target package/app/etc, resolve all the relevant paths
 * @param target
 * @returns A Paths object containing all relevant paths
 */
export default function determineTargetPaths(
  target: string,
  targetDirectory: string,
): Paths {
  const modularRoot = getModularRoot();
  const targetName = toParamCase(target);

  // Make sure any symlinks in the project folder are resolved:
  // https://github.com/facebook/create-react-app/issues/637
  const appDirectory = fs.realpathSync(targetDirectory);
  const resolveApp = (relativePath: string) =>
    path.resolve(appDirectory, relativePath);

  interface AppPackageJson {
    homepage?: string;
  }

  // We use `PUBLIC_URL` environment variable or "homepage" field to infer
  // "public path" at which the app is served.
  // webpack needs to know it to put the right <script> hrefs into HTML even in
  // single-page apps that may serve index.html for nested URLs like /todos/42.
  // We can't use a relative path in HTML because we don't want to load something
  // like /todos/42/static/js/bundle.7289d.js. We have to know the root.
  const publicUrl = getConfig('publicUrl', targetDirectory);
  const publicUrlOrPath = getPublicUrlOrPath(
    process.env.NODE_ENV === 'development',
    (fs.readJSONSync(resolveApp('package.json')) as AppPackageJson).homepage,
    publicUrl === '' ? undefined : publicUrl,
  );

  const moduleFileExtensions = [
    'web.mjs',
    'mjs',
    'web.js',
    'js',
    'web.ts',
    'ts',
    'web.tsx',
    'tsx',
    'json',
    'web.jsx',
    'jsx',
  ];

  // Resolve file paths in the same order as webpack
  const resolveModule = (
    resolveFn: (relativePath: string) => string,
    filePath: string,
  ): string => {
    const extension = moduleFileExtensions.find((extension) =>
      fs.existsSync(resolveFn(`${filePath}.${extension}`)),
    );

    if (extension) {
      return resolveFn(`${filePath}.${extension}`);
    }

    return resolveFn(`${filePath}.js`);
  };

  const ownPath = path.dirname(path.join(__dirname, '..', '..'));

  const resolveOwn = (relativePath: string) =>
    path.resolve(ownPath, relativePath);

  const resolveModular = (relativePath: string) =>
    path.resolve(modularRoot, relativePath);

  // TODO: This could be deduplciated by using getWorkspaceInfo locations
  // Get the workspaces field from the manifest to calculate the possible workspace directories
  const rootManifest = fs.readJsonSync(
    require.resolve(resolveModular('package.json')),
  ) as { workspaces: string[] | { packages: string[] } };
  const workspaceDefinitions =
    (Array.isArray(rootManifest?.workspaces)
      ? rootManifest?.workspaces
      : rootManifest?.workspaces?.packages) || [];

  // Calculate all the possible workspace directories. We need to convert paths to posix separator to feed it into globby
  // and convert back to native separator after
  const workspaceDirectories = globby
    .sync(workspaceDefinitions.map(resolveModular).map(toPosix), {
      onlyDirectories: true,
    })
    .map(fromPosix);

  const dotenv = resolveApp('.env');
  const appPath = resolveApp('.');
  const appPublic = resolveApp('public');
  const appHtml = resolveApp('public/index.html');
  const appIndexJs = resolveModule(resolveApp, 'src/index');
  const appPackageJson = resolveApp('package.json');
  const appSrc = resolveApp('src');
  const appTsConfig = resolveApp('tsconfig.json');
  const appJsConfig = resolveApp('jsconfig.json');
  const testsSetup = resolveModule(resolveApp, 'src/setupTests');
  const proxySetup = resolveApp('src/setupProxy.js');
  const appNodeModules = resolveApp('node_modules');
  const ownNodeModules = resolveOwn('node_modules');
  const appTypeDeclarations = resolveApp('src/react-app-env.d.ts');
  const ownTypeDeclarations = resolveOwn('react-app.d.ts');
  const includeDirectories = [
    ...workspaceDirectories,
    resolveModular('node_modules/.modular'),
  ];

  const appBuild = path.join(modularRoot, 'dist', targetName);

  const paths: Paths = {
    modularRoot,
    publicUrlOrPath,
    dotenv,
    appPath,
    appBuild,
    appPublic,
    appHtml,
    appIndexJs,
    appPackageJson,
    appSrc,
    appTsConfig,
    appJsConfig,
    testsSetup,
    proxySetup,
    appNodeModules,
    ownNodeModules,
    appTypeDeclarations,
    ownTypeDeclarations,
    moduleFileExtensions,
    includeDirectories,
  };

  return paths;
}

function toPosix(pathString: string) {
  return pathString.split(path.sep).join(path.posix.sep);
}

function fromPosix(pathString: string) {
  return pathString.split(path.posix.sep).join(path.sep);
}
