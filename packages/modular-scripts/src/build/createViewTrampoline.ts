import { Dependency } from '@schemastore/package';
import * as esbuild from 'esbuild';
import * as fs from 'fs-extra';
import { createDependenciesRewritePlugin } from '../esbuild-scripts/plugins/rewriteDependenciesPlugin';

export async function createViewTrampoline(
  outputPath: string,
  fileName: string,
  srcPath: string,
  dependencies: Dependency,
  browserTarget: string[],
) {
  const fileRelativePath = `./${fileName}`;

  const trampolineTemplate = `
import ReactDOM from 'react-dom'
import React from 'react'
import Component from '${fileRelativePath}'
const DOMRoot = document.getElementById('root');
ReactDOM.render(<Component />, DOMRoot);`;

  const indexTemplate = `
<!DOCTYPE html>
<html>
  <body>
    <div id="root"></div>
    <script type="module" src="static/js/__trampoline.js"></script>
  </body>
</html>
`;
  const trampolinePath = `${outputPath}/static/js/__trampoline.js`;
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
    target: browserTarget,
    outfile: trampolinePath,
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
      createDependenciesRewritePlugin({
        ...dependencies,
        'react-dom': dependencies.react,
      }),
    ],
  });
  await fs.writeFile(`${outputPath}/index.html`, indexTemplate);
}

function escapeRegex(s: string) {
  return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}
