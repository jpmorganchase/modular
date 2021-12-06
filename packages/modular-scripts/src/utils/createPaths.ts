import { paramCase as toParamCase } from 'change-case';
import fs from 'fs-extra';
import * as path from 'path';

import getPublicUrlOrPath from './getPublicUrlOrPath';
import getModularRoot from './getModularRoot';
import getLocation from './getLocation';
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
  testsSetup: string;
  proxySetup: string;
  appNodeModules: string;
  ownNodeModules: string;
  appTypeDeclarations: string;
  ownTypeDeclarations: string;
  moduleFileExtensions: string[];
}

export default async function createPaths(target: string): Promise<Paths> {
  const modularRoot = getModularRoot();
  const targetDirectory = await getLocation(target);
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
  const publicUrlOrPath = getPublicUrlOrPath(
    process.env.NODE_ENV === 'development',
    (fs.readJSONSync(resolveApp('package.json')) as AppPackageJson).homepage,
    process.env.PUBLIC_URL,
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

  const dotenv = resolveApp('.env');
  const appPath = resolveApp('.');
  const appPublic = resolveApp('public');
  const appHtml = resolveApp('public/index.html');
  const appIndexJs = resolveModule(resolveApp, 'src/index');
  const appPackageJson = resolveApp('package.json');
  const appSrc = resolveApp('src');
  const appTsConfig = resolveApp('tsconfig.json');
  const testsSetup = resolveModule(resolveApp, 'src/setupTests');
  const proxySetup = resolveApp('src/setupProxy.js');
  const appNodeModules = resolveApp('node_modules');
  const ownNodeModules = resolveOwn('node_modules');
  const appTypeDeclarations = resolveApp('src/react-app-env.d.ts');
  const ownTypeDeclarations = resolveOwn('react-app.d.ts');

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
    testsSetup,
    proxySetup,
    appNodeModules,
    ownNodeModules,
    appTypeDeclarations,
    ownTypeDeclarations,
    moduleFileExtensions,
  };

  return paths;
}
