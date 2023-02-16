//TODO: DELETE

/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-var-requires */
import path from 'path';
import fs from 'fs';
import globby from 'globby';
import getPublicUrlOrPath from '../../react-dev-utils/getPublicUrlOrPath';
import { getConfig } from '../../utils/config';

export default function getPaths(
  modularRoot: string,
  appDirectory: string,
  modularPackage: string,
  modularPackageName: string,
): Paths {
  // Make sure any symlinks in the project folder are resolved:
  // https://github.com/facebook/create-react-app/issues/637
  console.log(appDirectory);
  const resolveApp = (relativePath: string) =>
    path.resolve(appDirectory, relativePath);
  const resolveModular = (relativePath: string) =>
    path.resolve(modularRoot, relativePath);
  console.log(resolveApp('src'));
  // We use `PUBLIC_URL` environment variable or "homepage" field to infer
  // "public path" at which the app is served.
  // webpack needs to know it to put the right <script> hrefs into HTML even in
  // single-page apps that may serve index.html for nested URLs like /todos/42.
  // We can't use a relative path in HTML because we don't want to load something
  // like /todos/42/static/js/bundle.7289d.js. We have to know the root.
  const publicUrlOrPath = getPublicUrlOrPath(
    process.env.NODE_ENV === 'development',
    require(resolveApp('package.json')).homepage,
    getConfig('publicUrl', appDirectory),
  );
  console.log(publicUrlOrPath);

  const buildPath = path.join(modularRoot, 'dist', modularPackageName);

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
    resolveFn: { (relativePath: string): string; (arg0: string): fs.PathLike },
    filePath: string,
  ) => {
    const extension = moduleFileExtensions.find((extension) =>
      fs.existsSync(resolveFn(`${filePath}.${extension}`)),
    );

    if (extension) {
      return resolveFn(`${filePath}.${extension}`);
    }

    return resolveFn(`${filePath}.js`);
  };

  // Get the workspaces field from the manifest to calculate the possible workspace directories
  const rootManifest = require(resolveModular('package.json'));
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

  // config after eject: we're in ./config/
  const paths = {
    appPath: resolveApp('.'),
    appBuild: buildPath,
    appPublic: resolveApp('public'),
    appHtml: resolveApp('public/index.html'),
    appIndexJs: resolveModule(resolveApp, 'src/index'),
    appPackageJson: resolveApp('package.json'),
    appSrc: resolveApp('src'),
    includeDirectories: [
      workspaceDirectories,
      resolveModular('node_modules/.modular'),
    ],
    appTsConfig: resolveApp('tsconfig.json'),
    appJsConfig: resolveApp('jsconfig.json'),
    proxySetup: resolveApp('src/setupProxy.js'),
    appNodeModules: resolveApp('node_modules'),
    publicUrlOrPath,
    modularRoot,
    modularPackage,
    modularPackageName,
    moduleFileExtensions: moduleFileExtensions, // TODO: Is this right?
  };
  return paths;
}

function toPosix(pathString: string) {
  return pathString.split(path.sep).join(path.posix.sep);
}

function fromPosix(pathString: string) {
  return pathString.split(path.posix.sep).join(path.sep);
}

export interface Paths {
  appPath: string;
  appBuild: string;
  appPublic: string;
  appHtml: string;
  appIndexJs: string;
  appPackageJson: string;
  appSrc: string;
  includeDirectories: (string | string[])[];
  appTsConfig: string;
  appJsConfig: string;
  proxySetup: string;
  appNodeModules: string;
  publicUrlOrPath: string;
  modularRoot: string;
  modularPackage: string;
  modularPackageName: string;
  moduleFileExtensions: string[];
}
