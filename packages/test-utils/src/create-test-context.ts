import { join } from 'path';
import { realpathSync } from 'fs';
import { io } from './io';

export interface ITestContext {
  /** Creates a directory under the repo root at the given path(s) */
  dir(...segments: string[]): Promise<string>;

  /** Creates a file at the given path under the repo root with the supplied content */
  file(path: string | [string, string], content?: string): Promise<string>;

  /** Creates many files at the given paths, each with file content based on their name */
  files(...paths: Array<string | [string, string]>): Promise<void>;

  /** Generates the path to a location within the root directory */
  path(...segments: string[]): string;

  /** Root directory for the test context */
  readonly root: string;

  /** Fully qualified resolved path, accounts for any symlinks to the temp directory */
  readonly rootResolvedPath: string;
}

class TestContext implements ITestContext {
  #root: string;

  constructor(root: string) {
    this.#root = root;
  }

  path(...segments: string[]) {
    return join(this.#root, ...segments);
  }

  get root() {
    return this.#root;
  }

  get rootResolvedPath() {
    return realpathSync(this.#root);
  }

  async dir(...paths: string[]): Promise<string> {
    if (!paths.length) {
      return this.#root;
    }

    return await io.mkdir(this.path(...paths));
  }

  async file(path: string | [string, string], content = ''): Promise<string> {
    if (Array.isArray(path)) {
      await this.dir(path[0]);
    }

    const pathArray = Array.isArray(path) ? path : [path];
    return await io.writeFile(this.path(...pathArray), content);
  }

  async files(...paths: Array<string | [string, string]>): Promise<void> {
    for (const path of paths) {
      await this.file(path);
    }
  }
}

export async function createTestContext(): Promise<ITestContext> {
  return new TestContext(await io.mkdtemp());
}
