import * as esbuild from 'esbuild';
import { createRewriteDependenciesPlugin } from '../plugins/rewriteDependenciesPlugin';
import type { Dependency } from '@schemastore/package';

export const indexFile = `
<!DOCTYPE html>
<html>
  <body>
    <div id="root"></div>
    <script type="module" src="static/js/__trampoline.js"></script>
  </body>
</html>
`;

export async function createViewTrampoline(
  fileName: string,
  srcPath: string,
  dependencies: Dependency,
  browserTarget: string[],
): Promise<esbuild.BuildResult & { outputFiles: esbuild.OutputFile[] }> {
  const fileRelativePath = `./${fileName}`;

  const trampolineTemplate = `
import ReactDOM from 'react-dom'
import React from 'react'
import Component from '${fileRelativePath}'
const DOMRoot = document.getElementById('root');
ReactDOM.render(<Component />, DOMRoot);`;

  const fileRegexp = new RegExp(String.raw`^${escapeRegex(fileRelativePath)}$`);

  // Build the trampoline on the fly, from stdin
  const buildResult = await esbuild.build({
    stdin: {
      contents: trampolineTemplate,
      resolveDir: srcPath,
      sourcefile: '__trampoline.tsx',
      loader: 'tsx',
    },
    format: 'esm',
    bundle: true,
    write: false,
    target: browserTarget,
    plugins: [
      // See https://github.com/evanw/esbuild/issues/456
      {
        name: 'import-path',
        setup(build) {
          build.onResolve({ filter: fileRegexp }, (args) => {
            return { path: args.path, external: true };
          });
        },
      },
      createRewriteDependenciesPlugin({
        ...dependencies,
        'react-dom': dependencies.react,
      }),
    ],
  });

  return buildResult;
}

function escapeRegex(s: string) {
  return s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}
