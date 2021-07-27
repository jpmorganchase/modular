import * as fs from 'fs-extra';
import * as path from 'path';
import {
  pascalCase as toPascalCase,
  paramCase as toParamCase,
} from 'change-case';
import prompts from 'prompts';
import getModularRoot from './utils/getModularRoot';
import execSync from './utils/execSync';
import actionPreflightCheck from './utils/actionPreflightCheck';
import getAllFiles from './utils/getAllFiles';

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
  const packageTypePath = path.join(__dirname, '../types', type);

  // create a new package source folder
  if (fs.existsSync(newPackagePath)) {
    throw new Error(`A package already exists at ${destination}!`);
  }

  fs.mkdirpSync(newPackagePath);
  fs.copySync(packageTypePath, newPackagePath);

  const packageFilePaths = getAllFiles(newPackagePath);

  for (const packageFilePath of packageFilePaths) {
    fs.writeFileSync(
      packageFilePath,
      fs
        .readFileSync(packageFilePath, 'utf8')
        .replace(/PackageName__/g, name)
        .replace(/ComponentName__/g, newComponentName),
    );
    if (path.basename(packageFilePath) === 'packagejson') {
      // we've named package.json as packagejson in these templates
      fs.moveSync(
        packageFilePath,
        packageFilePath.replace('packagejson', 'package.json'),
      );
    }
  }

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
  execSync('yarnpkg', yarnArgs, { cwd: modularRoot });
}

export default actionPreflightCheck(addPackage);
