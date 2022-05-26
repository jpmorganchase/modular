import execa from 'execa';
import memoize from './memoize';
import getModularRoot from './getModularRoot';
import * as logger from './logger';
import stripAnsi from 'strip-ansi';

interface WorkspaceObj {
  location: string;
  workspaceDependencies: string[];
  mismatchedWorkspaceDependencies: string[];
}
type WorkspaceMap = Record<string, WorkspaceObj>;

function formatYarn1Workspace(stdout: string): WorkspaceMap {
  return JSON.parse(stdout) as WorkspaceMap;
}

interface YarnWorkspaceV3 extends WorkspaceObj {
  name: string;
}

function formatNewYarnWorkspace(stdout: string): WorkspaceMap {
  return stdout.split(/\r?\n/).reduce((acc, workspaceString) => {
    const { name, ...rest } = JSON.parse(workspaceString) as YarnWorkspaceV3;

    if (rest.location !== '.') {
      acc[name] = rest;
    }

    return acc;
  }, {} as WorkspaceMap);
}

type SupportedPackageManagers = {
  [prop: string]: PackageManagerInfo;
};

export interface PackageManagerInfo {
  getWorkspaceCommand: string;
  formatWorkspaceCommandOutput: (stdout: string) => WorkspaceMap;
}

const supportedPackageManagers: SupportedPackageManagers = {
  yarn1: {
    getWorkspaceCommand: 'yarn --silent workspaces info',
    formatWorkspaceCommandOutput: formatYarn1Workspace,
  },
  yarn2: {
    getWorkspaceCommand: 'yarn workspaces list --json -v',
    formatWorkspaceCommandOutput: formatNewYarnWorkspace,
  },
  yarn3: {
    getWorkspaceCommand: 'yarn workspaces list --json -v',
    formatWorkspaceCommandOutput: formatNewYarnWorkspace,
  },
};

async function getCommandOutput(
  cwd: string,
  file: string,
  args: readonly string[],
): Promise<string> {
  const result = await execa(file, args, {
    cwd,
    reject: false,
    cleanup: true,
  });

  const { exitCode, stdout, stderr } = result;

  if (stderr && !!exitCode) {
    logger.error(stderr);
    throw new Error(`Failed to lookup yarn workspace information`);
  }

  // strip out ANSI color codes and escape characters
  return stripAnsi(stdout);
}

async function getPackageManagerInfo(cwd: string, packageManager: string) {
  if (packageManager === 'yarn') {
    const yarnVersion = await getCommandOutput(cwd, 'yarn', ['--version']);
    if (yarnVersion.startsWith('1.')) {
      return supportedPackageManagers.yarn1;
    }
    if (yarnVersion.startsWith('2.')) {
      return supportedPackageManagers.yarn2;
    }
    if (yarnVersion.startsWith('3.')) {
      return supportedPackageManagers.yarn3;
    }
  }

  throw new Error(`${packageManager} is not supported.`);
}

export async function getWorkspaceInfo(
  cwd: string,
  packageManager: string,
): Promise<WorkspaceMap> {
  const packageManagerUtils = await getPackageManagerInfo(cwd, packageManager);
  const [file, ...args] = packageManagerUtils.getWorkspaceCommand.split(' ');
  const workspaceCommandOutput = await getCommandOutput(cwd, file, args);
  return packageManagerUtils.formatWorkspaceCommandOutput(
    workspaceCommandOutput,
  );
}

function _getAllWorkspaces(): Promise<WorkspaceMap> {
  const modularRoot = getModularRoot();

  return getWorkspaceInfo(modularRoot, 'yarn');
}

export const getAllWorkspaces = memoize(_getAllWorkspaces);
