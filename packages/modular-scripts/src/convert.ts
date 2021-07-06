import { IncludeDefinition as TSConfig } from '@schemastore/tsconfig';
import { Dependency } from '@schemastore/package';
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
  execa.sync('git', ['stash', '-u']);
  throw new Error('Failed to perform action cleanly. Stashing git changes...');
}

process.on('SIGINT', () => {
  resetChanges();
});

export async function convert(cwd: string = process.cwd()): Promise<void> {
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
      const { initModularFolder } = await import('./init');
      logger.debug(
        "You don't have a modular repo initialized. Setting it up for you now.",
      );
      await initModularFolder(cwd, true);
    }

    const rootPackageJson = (await fs.readJson(
      path.join(cwd, 'package.json'),
    )) as ModularPackageJson;

    const packageName = rootPackageJson.name as string;

    logger.log(`Setting up new modular app for ${packageName}`);

    // Create a modular app package folder
    const packageTypePath = path.join(__dirname, '../types', 'app');
    const newPackagePath = path.join(cwd, 'packages', packageName);
    fs.mkdirpSync(newPackagePath);

    const newPackageJson = fs.readJsonSync(
      path.join(packageTypePath, 'packagejson'),
    ) as ModularPackageJson;

    // Bring key props from root package.json to new app
    newPackageJson.name = packageName;
    newPackageJson.browserslist = rootPackageJson.browserslist;
    fs.writeJsonSync(
      path.join(newPackagePath, 'package.json'),
      newPackageJson,
      { spaces: 2 },
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

    logger.debug('Set tsconfig.json to include your workspaces');

    let tsConfig: TSConfig = {
      extends: 'modular-scripts/tsconfig.json',
      include: ['modular', 'packages/**/src'],
    };

    const rootTSConfigPath = path.join(cwd, 'tsconfig.json');
    // If they have a tsconfig, include packages/**/src
    if (fs.existsSync(rootTSConfigPath)) {
      tsConfig = fs.readJsonSync(rootTSConfigPath) as TSConfig;

      // The tsconfig might already have the necessary includes
      // but just in case, this will ensure that it does
      const include: string[] = tsConfig.include || [];
      tsConfig.include = include.filter(
        (key: string) => !['src', 'packages/**/src'].includes(key),
      );
      tsConfig.include.push('packages/**/src');
    }
    fs.writeJsonSync(rootTSConfigPath, tsConfig, { spaces: 2 });
    fs.writeJSONSync(
      path.join(newPackagePath, 'tsconfig.json'),
      {
        extends: path.relative(newPackagePath, cwd) + '/tsconfig.json',
      },
      { spaces: 2 },
    );

    logger.debug('Updating your react-app-env.d.ts for modular-scripts');

    fs.writeFileSync(
      path.join(newPackagePath, 'src', 'react-app-env.d.ts'),
      fs.readFileSync(
        path.join(packageTypePath, 'src', 'react-app-env.d.ts'),
        'utf8',
      ),
    );

    logger.debug('Migrating your setupTests file to modular');

    const setupFileName = 'setupTests';
    const setupFilesExts = ['js', 'ts'];
    setupFilesExts.forEach((ext) => {
      const file = `${setupFileName}.${ext}`;
      if (fs.existsSync(path.join(newPackagePath, 'src', file))) {
        fs.writeFileSync(
          path.join(cwd, 'modular', file),
          fs.readFileSync(path.join(newPackagePath, 'src', file), 'utf8'),
        );
        rimraf.sync(path.join(newPackagePath, 'src', file));
      }
    });

    logger.debug('Removing react-scripts from dependencies list');
    // Remove react scripts dependency

    const rootDeps: Dependency = rootPackageJson.dependencies || {};
    rootPackageJson.dependencies = Object.keys(rootDeps).reduce((acc, dep) => {
      if (dep !== 'react-scripts') {
        return { ...acc, [dep]: rootDeps[dep] };
      }
      return acc;
    }, {});

    fs.writeJsonSync(path.join(cwd, 'package.json'), rootPackageJson, {
      spaces: 2,
    });

    logger.log(
      'Modular repo was set up successfully. Running yarn to update dependencies',
    );

    execa.sync('yarnpkg', ['--silent'], { cwd });

    logger.log('Validating your modular project...');
    await check();
  } catch (err) {
    logger.error(err);
    resetChanges();
  }
}
