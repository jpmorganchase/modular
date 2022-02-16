import * as fs from 'fs-extra';
import * as path from 'path';
import {
  pascalCase as toPascalCase,
  paramCase as toParamCase,
} from 'change-case';
import prompts from 'prompts';
import getModularRoot from './utils/getModularRoot';
import execAsync from './utils/execAsync';
import actionPreflightCheck from './utils/actionPreflightCheck';
import getAllFiles from './utils/getAllFiles';
import LineFilterOutStream from './utils/LineFilterOutStream';

const packagesRoot = 'packages';

async function addPackage(
  destination: string,
  typeArg: string | void,
  nameArg: string | void,
  preferOffline = true,
  verbose = false,
): Promise<void> {
  const { type, name } =
    (typeArg && nameArg ? { type: typeArg, name: nameArg } : null) ||
    ((await prompts([
      {
        name: 'name',
        type: 'text',
        message: `What would you like to name this package?`,
        initial: toParamCase(destination),
      },
      {
        name: 'type',
        type: 'select',
        message: `What kind of package is this?`,
        choices: [
          { title: 'A plain package', value: 'package' },
          { title: 'A view within an application', value: 'view' },
          { title: 'A standalone application', value: 'app' },
        ],
        initial: 0,
      },
    ])) as { type: string; name: string });

  if (!['app', 'view', 'package'].includes(type)) {
    throw new Error(
      `Type ${type} does not exist, please use app, view or package`,
    );
  }

  const modularRoot = getModularRoot();
  const newComponentName = toPascalCase(name);

  const newPackagePath = path.join(modularRoot, packagesRoot, destination);

  if (fs.existsSync(newPackagePath)) {
    throw new Error(`A package already exists at ${destination}!`);
  }

  const newModularPackageJsonPath = require.resolve(
    `modular-template-${type}/package.json`,
  );
  const packageTypePath = path.dirname(newModularPackageJsonPath);

  // create a new package source folder
  fs.mkdirpSync(newPackagePath);
  fs.copySync(packageTypePath, newPackagePath, {
    recursive: true,
    filter(src) {
      return !(path.basename(src) === 'package.json');
    },
  });

  const packageFilePaths = getAllFiles(newPackagePath);

  for (const packageFilePath of packageFilePaths) {
    fs.writeFileSync(
      packageFilePath,
      fs
        .readFileSync(packageFilePath, 'utf8')
        .replace(/PackageName__/g, name)
        .replace(/ComponentName__/g, newComponentName),
    );
  }

  await fs.writeJson(
    path.join(newPackagePath, 'package.json'),
    {
      name,
      private: type === 'app',
      modular: {
        type,
      },
      version: '1.0.0',
    },
    {
      spaces: 2,
    },
  );

  if (type === 'app') {
    // add a tsconfig, because CRA expects it
    await fs.writeJSON(
      path.join(newPackagePath, 'tsconfig.json'),
      {
        extends: path.relative(newPackagePath, modularRoot) + '/tsconfig.json',
      },
      { spaces: 2 },
    );
  }

  const yarnArgs = verbose ? ['--verbose'] : ['--silent'];
  if (preferOffline) {
    yarnArgs.push('--prefer-offline');
  }
  const subprocess = execAsync('yarnpkg', yarnArgs, {
    cwd: modularRoot,
    stderr: verbose ? 'inherit' : 'pipe',
  });
  if (!verbose) {
    // Remove warnings
    subprocess.stderr
      ?.pipe(new LineFilterOutStream(/.*warning.*/))
      .pipe(process.stderr);
  }
  await subprocess;
}

export default actionPreflightCheck(addPackage);
