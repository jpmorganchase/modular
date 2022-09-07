import fs from 'fs-extra';
import path from 'path';
import minimatch from 'minimatch';
import getModularRoot from './getModularRoot';
import type { ModularPackageJson } from '@modular-scripts/modular-types';

// This checks if a path is included in the workspaces paths of a monorepo
export async function isInWorkspaces(targetPath: string): Promise<boolean> {
  const workspaceGlobs = await getWorkspaceGlobs();
  return workspaceGlobs.some((glob) => minimatch(targetPath, glob));
}

// This function gets all the globs in "workspaces" field in the root package manifest
async function getWorkspaceGlobs(): Promise<string[]> {
  const modularRoot = getModularRoot();
  const rootPackageJsonPath = path.join(modularRoot, 'package.json');
  const rootPackageJson = (await fs.readJSON(
    rootPackageJsonPath,
  )) as ModularPackageJson;
  const workspaceGlobs = Array.isArray(rootPackageJson?.workspaces)
    ? rootPackageJson?.workspaces
    : rootPackageJson?.workspaces?.packages;
  if (!workspaceGlobs) {
    throw new Error(
      `Root package.json at path "${rootPackageJsonPath}" has no "workspaces" field`,
    );
  }
  return workspaceGlobs;
}
