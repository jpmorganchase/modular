'use strict';

const path = require('path');
const fs = require('fs');
const globby = require('globby');
const getPublicUrlOrPath = require('../../react-dev-utils/getPublicUrlOrPath');

if (!process.env.MODULAR_ROOT) {
  throw new Error(
    // this should never be visible to a user, only us when we're developing
    'MODULAR_ROOT not found in environment, did you forget to pass it when calling modular-scripts in cli.ts?',
  );
}

if (!process.env.MODULAR_PACKAGE) {
  throw new Error(
    // this should never be visible to a user, only us when we're developing
    'MODULAR_PACKAGE not found in environment, did you forget to pass it when calling modular-scripts in cli.ts?',
  );
}

if (!process.env.MODULAR_PACKAGE_NAME) {
  throw new Error(
    // this should never be visible to a user, only us when we're developing
    'MODULAR_PACKAGE_NAME not found in environment, did you forget to pass it when calling modular-scripts in cli.ts?',
  );
}

const modularRoot = process.env.MODULAR_ROOT;
const modularPackage = process.env.MODULAR_PACKAGE;
const modularPackageName = process.env.MODULAR_PACKAGE_NAME;

// Make sure any symlinks in the project folder are resolved:
// https://github.com/facebook/create-react-app/issues/637
const appDirectory = fs.realpathSync(process.cwd());
const resolveApp = (relativePath) => path.resolve(appDirectory, relativePath);
const resolveModular = (relativePath) =>
  path.resolve(modularRoot, relativePath);

// We use `PUBLIC_URL` environment variable or "homepage" field to infer
// "public path" at which the app is served.
// webpack needs to know it to put the right <script> hrefs into HTML even in
// single-page apps that may serve index.html for nested URLs like /todos/42.
// We can't use a relative path in HTML because we don't want to load something
// like /todos/42/static/js/bundle.7289d.js. We have to know the root.
const publicUrlOrPath = getPublicUrlOrPath(
  process.env.NODE_ENV === 'development',
  require(resolveApp('package.json')).homepage,
  process.env.PUBLIC_URL,
);

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
const resolveModule = (resolveFn, filePath) => {
  const extension = moduleFileExtensions.find((extension) =>
    fs.existsSync(resolveFn(`${filePath}.${extension}`)),
  );

  if (extension) {
    return resolveFn(`${filePath}.${extension}`);
  }

  return resolveFn(`${filePath}.js`);
};

const rootManifest = require(resolveModular('package.json'));
const workspaceDefinitions =
  (Array.isArray(rootManifest?.workspaces)
    ? rootManifest?.workspaces
    : rootManifest?.workspaces?.packages) || [];
const workspaceDirectories = globby.sync(
  workspaceDefinitions.map(resolveModular),
  { onlyDirectories: true },
);

// config after eject: we're in ./config/
module.exports = {
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
};

module.exports.moduleFileExtensions = moduleFileExtensions;
