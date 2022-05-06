import * as esbuild from 'esbuild';
import * as fs from 'fs-extra';
import * as parse5 from 'parse5';
import escapeStringRegexp from 'escape-string-regexp';

import { createRewriteDependenciesPlugin } from './plugins/rewriteDependenciesPlugin';
import type { Paths } from '../utils/createPaths';
import getModularRoot from '../utils/getModularRoot';
import * as path from 'path';
import type { Dependency } from '@schemastore/package';

type FileType = '.css' | '.js';

export const indexFile = `
<!DOCTYPE html>
<html>
  <body>
    <div id="root"></div>
    <script type="module" src="static/js/_trampoline.js"></script>
  </body>
</html>
`;

export async function createViewTrampoline(
  fileName: string,
  srcPath: string,
  dependencies: Dependency,
  resolutions: Dependency,
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
      sourcefile: '_trampoline.tsx',
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
      createRewriteDependenciesPlugin(
        {
          ...dependencies,
          'react-dom': dependencies.react,
        },
        {
          ...resolutions,
          'react-dom': resolutions.react,
        },
      ),
    ],
  });

  return buildResult;
}

function escapeRegex(s: string) {
  return s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}

export function getEntryPoint(
  paths: Paths,
  metafile: esbuild.Metafile,
  type: FileType,
): string | undefined {
  const result = Object.entries(metafile.outputs).find(([key, output]) => {
    return output.entryPoint && path.extname(key) === type;
  });

  const outputFileName = result?.[0];

  if (outputFileName) {
    return path.relative(
      paths.appBuild,
      path.join(getModularRoot(), outputFileName),
    );
  } else {
    return undefined;
  }
}

export async function createIndex(
  paths: Paths,
  metafile: esbuild.Metafile | undefined,
  replacements: Record<string, string>,
  includeRuntime: boolean,
  indexContent?: string,
): Promise<string> {
  const index =
    indexContent ?? (await fs.readFile(paths.appHtml, { encoding: 'utf-8' }));
  const page = parse5.parse(index);
  const html = page.childNodes.find(
    (node) => node.nodeName === 'html',
  ) as parse5.Element;
  const head = html.childNodes.find(
    (node) => node.nodeName === 'head',
  ) as parse5.Element;

  const cssEntryPoint = metafile
    ? getEntryPoint(paths, metafile, '.css')
    : undefined;
  const jsEntryPoint = metafile
    ? getEntryPoint(paths, metafile, '.js')
    : undefined;

  if (cssEntryPoint) {
    head.childNodes.push(
      ...parse5.parseFragment(
        `<link rel="stylesheet" href="%PUBLIC_URL%/${cssEntryPoint}"></script>`,
      ).childNodes,
    );
  }
  const body = html.childNodes.find(
    (node) => node.nodeName === 'body',
  ) as parse5.Element;

  if (jsEntryPoint) {
    body.childNodes.push(
      ...parse5.parseFragment(
        `<script type="module" src="%PUBLIC_URL%/${jsEntryPoint}"></script>`,
      ).childNodes,
    );
  }

  if (includeRuntime) {
    body.childNodes.push(
      ...parse5.parseFragment(
        `<script type="module" src="%PUBLIC_URL%/_runtime/index.js"></script>`,
      ).childNodes,
    );
  }
  let data = parse5.serialize(page);

  // Run HTML through a series of user-specified string replacements.
  Object.keys(replacements).forEach((key) => {
    const value = replacements[key];
    data = data.replace(
      new RegExp('%' + escapeStringRegexp(key) + '%', 'g'),
      value,
    );
  });

  return data;
}

export function createBuildIndex(
  cssEntryPoint: string | undefined,
  replacements: Record<string, string>,
): string {
  const page = parse5.parse(indexFile);
  const html = page.childNodes.find(
    (node) => node.nodeName === 'html',
  ) as parse5.Element;
  const head = html.childNodes.find(
    (node) => node.nodeName === 'head',
  ) as parse5.Element;

  if (cssEntryPoint) {
    head.childNodes.push(
      ...parse5.parseFragment(
        `<link rel="stylesheet" href="%PUBLIC_URL%/${cssEntryPoint}"></script>`,
      ).childNodes,
    );
  }

  let data = parse5.serialize(page);

  // Run HTML through a series of user-specified string replacements.
  Object.keys(replacements).forEach((key) => {
    const value = replacements[key];
    data = data.replace(
      new RegExp('%' + escapeStringRegexp(key) + '%', 'g'),
      value,
    );
  });

  return data;
}
