import * as esbuild from 'esbuild';
import * as fs from 'fs-extra';

export async function createViewTrampoline(
  outputPath: string,
  fileName: string,
) {
  const fileRelativePath = `./${fileName}`;
  const trampolineTemplate = `
import ReactDOM from 'react-dom'
import Component from '${fileRelativePath}'
const DOMRoot = document.getElementById('root');
ReactDOM.render(Component(), DOMRoot);`;
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

  await fs.writeFile(trampolinePath, trampolineTemplate);
  // Build the trampoline on the fly, in-place
  const buildResult = await esbuild.build({
    entryPoints: [trampolinePath],
    format: 'esm',
    bundle: true,
    target: ['es2020'], // TODO
    outfile: trampolinePath,
    allowOverwrite: true,
    plugins: [
      {
        name: 'import-path',
        setup(build) {
          build.onResolve({ filter: fileRegexp }, (args) => {
            return { path: args.path, external: true };
          });
        },
      },
    ],
  });
  await fs.writeFile(`${outputPath}/index.html`, indexTemplate);
}

function escapeRegex(s: string) {
  return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}
