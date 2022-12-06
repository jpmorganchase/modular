import { PackageManagerArgs, WorkspaceMap, WorkspaceObj, Yarn1 } from './yarn1';
import type { PackageManagerIdentifier } from './detect';

interface YarnWorkspaceV3 extends WorkspaceObj {
  name: string;
}

export class Yarn3 extends Yarn1 {
  public readonly type: PackageManagerIdentifier = 'yarn3';

  protected enrichCommands(
    commands: string[],
    options: PackageManagerArgs = {},
  ): string[] {
    const prefix: string[] = [];

    if (this.isVerbose(options)) {
      // do nothing, yarn3 is very chatty
    }
    if (options.preferOffline ?? this.preferOffline) {
      prefix.push('--cached');
    }

    return [...prefix, ...commands];
  }

  async addWorkspaceDependencies(
    packages: string[],
    options?: PackageManagerArgs,
  ): Promise<void> {
    await this.exec(['add', ...packages], options);
  }

  protected workspaceCommand(): string[] {
    return ['workspaces', 'list', '--json', '-v'];
  }

  protected workspaceCommandParser(stdout: string): WorkspaceMap {
    return stdout.split(/\r?\n/).reduce((acc, workspaceString) => {
      const { name, ...rest } = JSON.parse(workspaceString) as YarnWorkspaceV3;

      if (rest.location !== '.') {
        acc[name] = rest;
      }

      return acc;
    }, {} as WorkspaceMap);
  }
}
