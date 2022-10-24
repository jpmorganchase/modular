import * as fs from 'fs-extra';
import * as path from 'path';
import validate from 'validate-npm-package-name';
import globby from 'globby';
import { pascalCase as toPascalCase } from 'change-case';
import prompts from 'prompts';
import getModularRoot from './utils/getModularRoot';
import execAsync from './utils/execAsync';
import * as logger from './utils/logger';
import actionPreflightCheck from './utils/actionPreflightCheck';
import getAllFiles from './utils/getAllFiles';
import LineFilterOutStream from './utils/LineFilterOutStream';
import { parsePackageName } from './utils/parsePackageName';
import { getWorkspaceInfo } from './utils/getWorkspaceInfo';
import { isInWorkspaces } from './utils/isInWorkspaces';

import type { ModularPackageJson } from '@modular-scripts/modular-types';

const packagesRoot = 'packages';
const CUSTOM_TEMPLATE = '__CHOOSE_MY_OWN__';

interface AddOptions {
  name: string | void;
  type: string | void;
  template: string | void;
  preferOffline: boolean;
  verbose: boolean;
  unstableName: string | void;
  path: string | void;
}

async function promptForName(name: string | void) {
  // The user may try to create a package using a name that already exists
  // so we loop until they choose a unique name or cancel
  while (true) {
    // Default the response the predefined `name` argument
    const response = name
      ? { name }
      : ((await prompts({
          name: 'name',
          type: 'text',
          message: `What would you like to name this package?`,
        })) as { name: string } | Record<string, never>);

    // Exit if the user cancels
    if (!response.name) {
      throw Error('No name entered, exiting');
    }

    return response.name;
  }
}

async function promptForType(type: string | void) {
  if (type) {
    return type;
  }

  const response = (await prompts({
    name: 'type',
    type: 'select',
    message: `What kind of package is this?`,
    choices: [
      { title: 'A plain package (package)', value: 'package' },
      {
        title: 'A micro-frontend React view compiled to a bundle file (view)',
        value: 'view',
      },
      {
        title: 'A micro-frontend React view compiled to ES Modules (esm-view)',
        value: 'esm-view',
      },
      { title: 'A micro-frontend React container (app)', value: 'app' },
      { title: 'Choose my own template', value: CUSTOM_TEMPLATE },
    ],
    initial: 0,
  })) as { type: string } | Record<string, never>;

  if (!response.type) {
    throw Error('No type entered, exiting');
  }

  return response.type;
}

async function promptForTemplate(templateName: string) {
  if (templateName === CUSTOM_TEMPLATE) {
    logger.warn(
      'Note: you are choosing to install a template that is not maintained by the modular team.',
    );

    const response = (await prompts([
      {
        name: 'templateName',
        type: 'text',
        message: `Which modular template would you like to use?`,
      },
    ])) as { templateName: string } | Record<string, never>;

    if (!response.templateName) {
      throw Error('No template name entered, exiting');
    }

    if (response.templateName[0] === '@') {
      const [scope, typePackageName] = response.templateName.split('/');
      templateName = `${scope}/modular-template-${typePackageName}`;
    } else {
      templateName = response.templateName;
    }
  }

  if (!templateName.startsWith('modular-template')) {
    return `modular-template-${templateName}`;
  }

  return templateName;
}

async function getYarnVersion() {
  const { stdout: version } = await execAsync('yarnpkg', ['--version'], {
    cwd: getModularRoot(),
    stdout: 'pipe',
  });
  return version;
}

async function addPackage({
  name: nameArg,
  type: typeArg,
  template: templateNameArg,
  preferOffline = true,
  verbose = false,
  unstableName,
  path: pathArg,
}: AddOptions): Promise<void> {
  const name = await promptForName(nameArg || unstableName);

  const modularRoot = getModularRoot();

  const { componentName, packagePath } = getNewPackageDetails({
    name,
    targetPath: pathArg || path.join(modularRoot, packagesRoot),
  });
  await validatePackageDetails(name, packagePath, pathArg);

  const packageType = templateNameArg ?? (await promptForType(typeArg));
  const templateName = await promptForTemplate(templateNameArg || packageType);
  const yarnVersion = await getYarnVersion();
  const isYarnV1 = yarnVersion.startsWith('1.');
  const installedPackageJsonPath = path.join(templateName, 'package.json');

  // Try and find the modular template package. If it's already been installed
  // in the project then continue without needing to do an install.
  // else we will fetch it from the yarn registry.
  let newModularPackageJsonPath;

  try {
    logger.log(`Looking for template ${templateName} in project...`);
    newModularPackageJsonPath = require.resolve(installedPackageJsonPath);
  } catch (e) {
    logger.log(
      'Fetching template package from registry, this may take a moment...',
    );
    const yarnAddArgs = ['add', templateName];

    if (isYarnV1) {
      yarnAddArgs.push('--prefer-offline', '-W');
    } else {
      yarnAddArgs.push('--cached');
    }

    const templateInstallSubprocess = execAsync('yarnpkg', yarnAddArgs, {
      cwd: modularRoot,
      stderr: 'pipe',
      stdout: 'ignore',
    });

    // Remove warnings
    templateInstallSubprocess.stderr?.pipe(
      new LineFilterOutStream(/.*warning.*/),
    );
    if (verbose) {
      templateInstallSubprocess.stderr?.pipe(process.stderr);
    }

    await templateInstallSubprocess;
    newModularPackageJsonPath = require.resolve(installedPackageJsonPath);
  }

  const modularTemplatePackageJson = (await fs.readJSON(
    newModularPackageJsonPath,
  )) as ModularPackageJson;

  const modularType = modularTemplatePackageJson?.modular?.type as string;
  if (modularType !== 'template') {
    throw new Error(
      `${templateName} is not marked as a "template". Check the package you are trying to install.`,
    );
  }

  const modularTemplateType = modularTemplatePackageJson?.modular
    ?.templateType as string;
  if (!['app', 'esm-view', 'view', 'package'].includes(modularTemplateType)) {
    throw new Error(
      `${templateName} has modular type: ${modularTemplateType}, which does not exist, please use update this template`,
    );
  }

  const packageTypePath = path.dirname(newModularPackageJsonPath);
  // create a new package source folder
  await fs.mkdirp(packagePath);
  await fs.copy(packageTypePath, packagePath, {
    recursive: true,
    filter(src) {
      return !(path.basename(src) === 'package.json');
    },
  });

  const packageFilePaths = getAllFiles(packagePath);

  // If we get our package locally we need to allowlist files like yarn publish does
  const packageAllowlist = globby
    .sync(modularTemplatePackageJson.files || ['*'], {
      cwd: packagePath,
      absolute: true,
    })
    .map((filePath) => path.normalize(filePath));

  for (const packageFilePath of packageFilePaths) {
    if (!packageAllowlist.includes(packageFilePath)) {
      fs.removeSync(packageFilePath);
    } else if (/\.(ts|tsx|js|jsx|json|md|txt)$/i.test(packageFilePath)) {
      fs.writeFileSync(
        packageFilePath,
        fs
          .readFileSync(packageFilePath, 'utf8')
          .replace(/PackageName__/g, name)
          .replace(/ComponentName__/g, componentName),
      );
    }
  }

  await fs.writeJson(
    path.join(packagePath, 'package.json'),
    {
      name,
      private: modularTemplateType === 'app',
      modular: {
        type: modularTemplateType,
      },
      main: modularTemplatePackageJson?.main,
      dependencies: modularTemplatePackageJson?.dependencies,
      version: '1.0.0',
    },
    {
      spaces: 2,
    },
  );

  if (modularTemplateType === 'app') {
    // add a tsconfig, because CRA expects it
    await fs.writeJSON(
      path.join(packagePath, 'tsconfig.json'),
      {
        extends: path.relative(packagePath, modularRoot) + '/tsconfig.json',
      },
      { spaces: 2 },
    );
  }

  const yarnArgs = [];

  if (isYarnV1) {
    if (verbose) {
      yarnArgs.push('--verbose');
    }

    if (preferOffline) {
      yarnArgs.push('--prefer-offline');
    }
  }

  const subprocess = execAsync('yarnpkg', yarnArgs, {
    cwd: modularRoot,
    stderr: 'pipe',
    stdout: verbose ? process.stdout : 'ignore',
  });

  // Remove warnings
  subprocess.stderr?.pipe(new LineFilterOutStream(/.*warning.*/));
  if (verbose) {
    subprocess.stderr?.pipe(process.stderr);
  }

  await subprocess;
}

function getNewPackageDetails({
  name,
  targetPath,
}: {
  name: string;
  targetPath: string;
}) {
  const { module } = parsePackageName(name);
  const packageDir = path.join(module);
  const componentName = toPascalCase(module);
  const packagePath = path.resolve(path.join(targetPath, packageDir));
  return { componentName, packagePath };
}

async function validatePackageDetails(
  name: string,
  packagePath: string,
  pathArg: string | void,
) {
  // Validate package name
  const { validForNewPackages, errors } = validate(name);
  const packageNameFormattedErrors = errors?.join('\n') || '';

  if (!validForNewPackages) {
    throw new Error(
      `Invalid package name "${name}" specified\n${packageNameFormattedErrors}`,
    );
  }

  // Find out if a package with the same name already exists
  if ((await getWorkspaceInfo())[name]) {
    throw new Error(`A package with name "${name}" already exists`);
  }

  if (pathArg) {
    // Find out if the provided base path is outside of modularRoot
    const relative = path.relative(getModularRoot(), pathArg);
    const isSubdir =
      relative && !relative.startsWith('..') && !path.isAbsolute(relative);
    if (!isSubdir) {
      throw new Error(
        `Provided base install path "${pathArg}" is not a descendant of the Modular root directory "${getModularRoot()}"`,
      );
    }

    // Find out if the provided base path is included in the package.json's "workspaces" globs
    if (!(await isInWorkspaces(pathArg))) {
      throw new Error(
        `Specified package path "${pathArg}" does not match modular workspaces glob patterns`,
      );
    }
  }

  // Find out if the directory already exists and it's not empty
  let dirExists = false;

  try {
    dirExists = !!(await fs.readdir(packagePath)).length;
  } catch {
    // noop: if this throws, the dir doesn't exist
  }

  if (dirExists) {
    throw new Error(
      `Directory "${packagePath}" already exists and it's not empty`,
    );
  }
}

export default actionPreflightCheck(addPackage);
