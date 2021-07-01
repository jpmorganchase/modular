import { IncludeDefinition as TSConfig } from '@schemastore/tsconfig';
import execa from 'execa';
import stripAnsi from 'strip-ansi';
import * as fs from 'fs-extra';
import * as path from 'path';
import {
  ModularPackageJson,
  isValidModularRootPackageJson,
} from './utils/isModularType';
import * as logger from './utils/logger';
import { check } from './check';

function cleanGit(cwd: string): boolean {
  const trackedChanged = stripAnsi(
    execa.sync('git', ['status', '-s'], {
      all: true,
      reject: false,
      cwd,
      cleanup: true,
    }).stdout,
  );
  return trackedChanged.length === 0;
}

function resetChanges(cwd: string): void {
  execa.sync('git', ['clean', '-fd'], { cwd });
}

export async function convert(cwd: string = process.cwd()): Promise<void> {
  process.on('SIGINT', () => {
    logger.error(
      'Failed to convert your react app to a modular app cleanly. Reverting git changes...',
    );
    resetChanges(cwd);
  });
  if (!cleanGit(cwd)) {
    throw new Error(
      'You have unsaved changes. Please save or stash them before we attempt to convert this react app to modular app.',
    );
  }

  try {
    if (
      !isValidModularRootPackageJson(cwd) ||
      !fs.existsSync(path.join(cwd, 'packages'))
    ) {
      throw new Error(
        "You don't have a modular repo initialized. Run `yarn modular init -y` for a quick set up.",
      );
    }

    const rootPackageJson = (await fs.readJson(
      path.join(cwd, 'package.json'),
    )) as ModularPackageJson;

    const packageName = rootPackageJson.name as string;

    // Create a modular app package folder
    const packageTypePath = path.join(__dirname, '../types', 'app');
    const newPackagePath = path.join(cwd, 'packages', packageName);
    fs.mkdirSync(newPackagePath);
    fs.writeFileSync(
      path.join(newPackagePath, 'package.json'),
      fs
        .readFileSync(path.join(packageTypePath, 'packagejson'), 'utf8')
        .replace(/PackageName__/g, packageName),
    );

    // Move the cwd folders to the modular app
    const srcFolders = ['src', 'public'];
    srcFolders.forEach((dir: string) => {
      if (fs.existsSync(path.join(cwd, dir))) {
        fs.moveSync(path.join(cwd, dir), path.join(newPackagePath, dir));
      } else {
        fs.copySync(
          path.join(packageTypePath, dir),
          path.join(newPackagePath, dir),
          { overwrite: true },
        );
      }
    });

    // If they have a tsconfig, include packages/**/src
    const tsConfigPath = path.join(cwd, 'tsconfig.json');
    if (fs.existsSync(tsConfigPath)) {
      const tsConfig = fs.readJsonSync(tsConfigPath) as TSConfig;

      // The tsconfig might already have the necessary includes
      // but just in case, this will ensure that it does
      let include: string[] = tsConfig.include || [];
      include = include.filter(
        (key: string) => !['src', 'packages/**/src'].includes(key),
      );
      include.push('packages/**/src');
      fs.writeJsonSync(tsConfigPath, {
        ...tsConfig,
        include,
      });
    }

    // If they have a react-app-env.d.ts file, replace reference types to modular scripts
    fs.writeFileSync(
      path.join(newPackagePath, 'src', 'react-app-env.d.ts'),
      fs.readFileSync(
        path.join(packageTypePath, 'src', 'react-app-env.d.ts'),
        'utf8',
      ),
    );

    execa.sync('yarnpkg', ['--silent'], { cwd });

    await check();
  } catch (err) {
    logger.error(
      'Failed to convert your react app to a modular app cleanly. Reverting git changes...',
    );
    // resetChanges(cwd);
    throw err;
  }
}

export default convert;
