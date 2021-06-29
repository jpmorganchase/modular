import execa from 'execa';
import stripAnsi from 'strip-ansi';
import * as fs from 'fs-extra';
import * as path from 'path';
import addPackage from './addPackage';
import { ModularPackageJson } from './utils/isModularType';
import rimraf from 'rimraf';
import * as logger from './utils/logger';

export function cleanGit(cwd: string): boolean {
  const trackedChanged = stripAnsi(
    execa.sync('git', ['status', '-s'], {
      all: true,
      reject: false,
      cwd,
      cleanup: true,
    }).stdout,
  );
  console.log('trackedChanged: ', trackedChanged);
  return trackedChanged.length === 0;
}

export function resetChanges(): void {
  execa.sync('git', ['reset', '--hard']);
}

export async function convert(cwd: string = process.cwd()): Promise<void> {
  // if (!cleanGit(cwd)) {
  //   throw new Error(
  //     'You have unsaved changes. Please save or stash them before we attempt to convert this react app to modular app.',
  //   );
  // }

  try {
    if (!fs.existsSync(path.join(cwd, 'package.json'))) {
      throw new Error(
        "You don't have a modular repo initialized. Run `yarn modular init -y` for a quick set up.",
      );
    }

    const rootPackageJson = (await fs.readJson(
      path.join(cwd, 'package.json'),
    )) as ModularPackageJson;

    const packageName = rootPackageJson.name as string;
    // Create a modular app for the current directory
    await addPackage(packageName, 'app', packageName);

    // Replace the template src and public folders with current react app folders
    const srcFolders = ['src', 'public'];
    srcFolders.forEach((dir: string) => {
      if (fs.existsSync(path.join(cwd, dir))) {
        rimraf.sync(path.join(`packages/${packageName}/${dir}`));
        fs.moveSync(path.join(cwd, dir), `packages/${packageName}/${dir}`);
      }
    });

    const rootTemplatePath = path.join(__dirname, '../types', 'root');
    fs.readdirSync(rootTemplatePath).forEach((dir) => {
      if (!fs.existsSync(path.join(cwd, dir))) {
        fs.copySync(path.join(rootTemplatePath, dir), path.join(cwd, dir));
      }
    });
  } catch (err) {
    logger.error(
      'Failed to convert your react app to a modular app cleanly. Reverting changes.',
    );
    resetChanges();
    throw err;
  }
}
