// get a list of all workspaces

// const visited = new Set()

// given an entrypoint
// normalise with esbuild
// find its imports with es-module-lexer
// if local, normalize to root
// if

import { promises as fs } from 'fs';
import { transform } from 'esbuild';
import * as lexer from 'es-module-lexer';

const esbuildTransformOptions = {};

export default function getAllImports(entries: string) {
  const visited = new Set<string>();
  const localImports = new Set<string>();
  const dependencies = new Set<string>();
  // eslint-disable-next-line require-yield
  async function* traverse(file: string, visited = new Set<string>()) {
    const content = await fs.readFile(file, 'utf-8');
    const { code, map } = await transform(content, esbuildTransformOptions);
    const [imports, exports] = await lexer.parse(code, file);

    await Promise.all(imports.map((imp) => {}));
    //normalise imports
  }
}
