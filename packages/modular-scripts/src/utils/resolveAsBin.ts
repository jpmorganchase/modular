import * as fs from 'fs-extra';
import * as path from 'path';
import type { ModularPackageJson } from 'modular-types';

async function getBin(packageDir: string) {
  const packageJson = (await fs.readJson(
    path.join(packageDir, 'package.json'),
  )) as ModularPackageJson;
  if (!packageJson.bin) {
    throw Error(`No bins found.`);
  } else {
    if (typeof packageJson.bin === 'string') {
      return packageJson.bin;
    } else {
      const bins = Object.values(packageJson.bin);
      return bins[0] as string;
    }
  }
}

export async function resolveAsBin(packageName: string): Promise<string> {
  const packageDir = path.dirname(
    require.resolve(`${packageName}/package.json`),
  );
  const bin = await getBin(packageDir);
  return path.join(packageDir, bin);
}
