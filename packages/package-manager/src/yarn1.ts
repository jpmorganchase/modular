import execa from 'execa';
import stripAnsi from 'strip-ansi';

import { promiseResult } from '@kwsites/promise-result';

import { LineFilterOutStream } from './line-filter-out-stream';
import { logger } from './logger';

import type { PackageManagerIdentifier } from './detect';

export type PackageManagerArgs = Partial<{
  cwd: string;
  verbose: boolean;
  preferOffline: boolean;
}>;

export interface WorkspaceObj {
  location: string;
  workspaceDependencies: string[];
  mismatchedWorkspaceDependencies: string[];
}

export type WorkspaceMap = Record<string, WorkspaceObj>;

export interface PackageManager {
  installed(): Promise<boolean>;

  addWorkspaceDependencies(
    packages: string[],
    options?: PackageManagerArgs,
  ): Promise<void>;

  // should also support var-args to be used after the `what`
  create(what: string, options?: PackageManagerArgs): Promise<void>;

  init(options?: PackageManagerArgs): Promise<void>;

  /**
   * Update the node modules, think `yarn` or `npm install`
   */
  refresh(options?: PackageManagerArgs): Promise<void>;

  /**
   * Get the version of the installed package manager
   * TODO: currently just returns the semver string `1.2.3` could return a more
   * TODO: useful object { major: number, minor: number, patch: number, satisfies (range: string): boolean }
   */
  version(options?: PackageManagerArgs): Promise<string>;

  /**
   * Get a description of the packages in the workspace - this should be deprecated
   * in favour of using the @modular-scripts/workspace-resolver which is already
   * package-manager agnostic
   */
  workspaces(options?: PackageManagerArgs): Promise<WorkspaceMap>;
}

export class Yarn1 implements PackageManager {
  public readonly type: PackageManagerIdentifier = 'yarn1';

  constructor(protected verbose = false, protected preferOffline = false) {}

  protected enrichCommands(
    commands: string[],
    options: PackageManagerArgs = {},
  ): string[] {
    const prefix: string[] = [];

    // TODO: should there be an else `--silent` ?
    if (this.isVerbose(options)) {
      prefix.push('--verbose');
    }
    if (options.preferOffline ?? this.preferOffline) {
      prefix.push('--prefer-offline');
    }

    return [...prefix, ...commands];
  }

  protected isVerbose(options?: PackageManagerArgs): boolean {
    return options?.verbose ?? this.verbose;
  }

  protected async exec(
    commands: string[],
    options: PackageManagerArgs & { cleanUp?: boolean } = {},
  ): Promise<string> {
    const verbose = this.isVerbose(options);
    const spawned = execa('yarnpkg', this.enrichCommands(commands, options), {
      cwd: options.cwd || process.cwd(),
      stderr: verbose ? 'inherit' : 'pipe',
      cleanup: options.cleanUp === true,
      reject: false,
    });

    if (!verbose) {
      spawned.stderr
        ?.pipe(new LineFilterOutStream(/.*warning.*/))
        .pipe(process.stderr);
    }

    const { exitCode, stdout, stderr } = await spawned;

    if (stderr && !!exitCode) {
      logger('ERROR', stderr);
      throw new Error(`Failed to lookup yarn workspace information`);
    }

    return stripAnsi(stdout);
  }

  async installed(): Promise<boolean> {
    const { threw, result } = await promiseResult(execa('yarnpkg', ['-v']));

    return !threw && /^1./.test(result.stdout);
  }

  async addWorkspaceDependencies(
    packages: string[],
    options?: PackageManagerArgs,
  ): Promise<void> {
    await this.exec(['add', '-W', ...packages], options);
  }

  async create(what: string, options?: PackageManagerArgs): Promise<void> {
    await this.exec(['create', what], {
      ...options,
      cleanUp: true,
    });
  }

  async init(options?: PackageManagerArgs): Promise<void> {
    await this.exec(['init', '-y'], options);
  }

  async refresh(options?: PackageManagerArgs): Promise<void> {
    await this.exec([], options);
  }

  async version(options?: PackageManagerArgs): Promise<string> {
    return await this.exec(['--version'], options);
  }

  async workspaces(options?: PackageManagerArgs): Promise<WorkspaceMap> {
    return this.workspaceCommandParser(
      await this.exec(this.workspaceCommand(), options),
    );
  }

  protected workspaceCommand(): string[] {
    return ['workspaces', 'info'];
  }

  protected workspaceCommandParser(stdout: string): WorkspaceMap {
    return JSON.parse(stdout) as WorkspaceMap;
  }
}
