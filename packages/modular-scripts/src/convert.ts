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
import rimraf from 'rimraf';

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

function resetChanges(): void {
  execa.sync('git', ['clean', '-fd']);
  throw new Error('Failed to perform action cleanly. Reverting git changes...');
}

export async function convert(cwd: string = process.cwd()): Promise<void> {
  process.on('SIGINT', () => {
    resetChanges();
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

    logger.log(`Setting up new modular app for ${packageName}`);

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

    logger.debug('Updating your tsconfig.json to include your workspaces');

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

    logger.debug('Updating your react-app-env.d.ts for modular-scripts');

    fs.writeFileSync(
      path.join(newPackagePath, 'src', 'react-app-env.d.ts'),
      fs.readFileSync(
        path.join(packageTypePath, 'src', 'react-app-env.d.ts'),
        'utf8',
      ),
    );

    logger.debug('Moving your setUpTests file to modular');

    const setUpTests = ['setUpTests.ts', 'setUpTests.js'];
    setUpTests.forEach((file) => {
      if (fs.existsSync(path.join(newPackagePath, 'src', file))) {
        fs.moveSync(
          path.join(cwd, 'modular', 'setUpTests.ts'),
          path
            .join(cwd, 'modular', 'setUpTests.ts')
            .replace('setUpTests.ts', file),
        );
        fs.writeFileSync(
          path.join(cwd, 'modular', file),
          fs.readFileSync(path.join(newPackagePath, 'src', file), 'utf8'),
        );
        rimraf.sync(path.join(newPackagePath, 'src', file));
      }
    });

    logger.log(
      'Modular app package was set up successfully. Running yarn inside workspace',
    );
    execa.sync('yarnpkg', ['--silent'], { cwd });

    logger.log('Validating your modular project...');
    await check();
  } catch (err) {
    resetChanges();
    throw err;
  }
}
