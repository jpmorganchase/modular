import * as fs from 'fs-extra';
import * as path from 'path';
import {
  pascalCase as toPascalCase,
  paramCase as toParamCase,
} from 'change-case';
import prompts from 'prompts';
import getModularRoot from './utils/getModularRoot';
import execAsync from './utils/execAsync';
import * as logger from './utils/logger';
import actionPreflightCheck from './utils/actionPreflightCheck';
import getAllFiles from './utils/getAllFiles';
import LineFilterOutStream from './utils/LineFilterOutStream';
import { ModularPackageJson } from './utils/isModularType';

const packagesRoot = 'packages';

async function addPackage(
  destination: string,
  typeArg: string | void,
  nameArg: string | void,
  preferOffline = true,
  verbose = false,
): Promise<void> {
  const { type: packageType, name } =
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
          { title: 'Choose my own template', value: '__CHOOSE_MY_OWN__' },
        ],
        initial: 0,
      },
    ])) as { type: string; name: string });

  let templateName = packageType;
  if (packageType === '__CHOOSE_MY_OWN__') {
    logger.warn(
      'You are choosing to install a template which is not maintained by the modular team.',
    );
    const typeResponse = await prompts([
      {
        name: 'typeName',
        type: 'text',
        message: `Which modular template would you like to use.?`,
      },
    ]);
    const typeName = typeResponse.typeName as string;
    if (typeName[0] === '@') {
      const [scope, typePackageName] = typeName.split('/');
      templateName = `${scope}/modular-template-${typePackageName}`;
    }
  } else {
    templateName = `modular-template-${templateName}`;
  }

  const modularRoot = getModularRoot();
  const newComponentName = toPascalCase(name);

  const newPackagePath = path.join(modularRoot, packagesRoot, destination);
  if (fs.existsSync(newPackagePath)) {
    throw new Error(`A package already exists at ${destination}!`);
  }

  // try and find the modular template packge, if it's already been installed
  // in the project then continue without needing to do an install.
  // else we will fetch it from the yarn registry.
  try {
    require.resolve(`${templateName}/package.json`);
  } catch (e) {
    const templateInstallSubprocess = execAsync(
      'yarnpkg',
      ['add', templateName, '--prefer-offline', '--silent', '-W'],
      {
        cwd: modularRoot,
        stderr: 'pipe',
      },
    );

    // Remove warnings
    templateInstallSubprocess.stderr?.pipe(
      new LineFilterOutStream(/.*warning.*/),
    );
    if (verbose) {
      templateInstallSubprocess.stderr?.pipe(process.stderr);
    }

    await templateInstallSubprocess;
  }

  const newModularPackageJsonPath = require.resolve(
    `${templateName}/package.json`,
  );

  const modularTemplatePackageJson = (await fs.readJSON(
    newModularPackageJsonPath,
  )) as ModularPackageJson;

  const modularType = modularTemplatePackageJson?.modular?.type as string;
  if (!['app', 'view', 'package'].includes(modularType)) {
    throw new Error(
      `${templateName} has modular type: ${modularType}, which does not exist, please use update this template`,
    );
  }

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
      private: templateName === 'app',
      modular: modularTemplatePackageJson.modular,
      version: '1.0.0',
    },
    {
      spaces: 2,
    },
  );

  if (templateName === 'app') {
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
    stderr: 'pipe',
  });

  // Remove warnings
  subprocess.stderr?.pipe(new LineFilterOutStream(/.*warning.*/));
  if (verbose) {
    subprocess.stderr?.pipe(process.stderr);
  }

  await subprocess;
}

export default actionPreflightCheck(addPackage);
