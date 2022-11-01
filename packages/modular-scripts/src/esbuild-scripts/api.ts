import * as esbuild from 'esbuild';
import * as fs from 'fs-extra';
import * as parse5 from 'parse5';
import dedent from 'dedent';
import escapeStringRegexp from 'escape-string-regexp';
import type { Paths } from '../utils/createPaths';
import getModularRoot from '../utils/getModularRoot';
import * as path from 'path';
import { normalizeToPosix } from './utils/formatPath';

type FileType = '.css' | '.js';

export function createViewTrampoline({
  fileName,
  importMap,
  useReactCreateRoot,
}: {
  fileName: string;
  importMap: Map<string, string> | undefined;
  useReactCreateRoot: boolean;
}): string {
  const fileRelativePath = `./${fileName}`;

  const reactDomCdnLocation = importMap?.get('react-dom');
  const reactCdnLocation = importMap?.get('react');

  if (!reactCdnLocation || !reactDomCdnLocation) {
    throw new Error(
      `react (${reactCdnLocation ?? 'undefined'}) or react-dom (${
        reactDomCdnLocation ?? 'undefined'
      }) location not specified. are you sure you have them in your package.json?`,
    );
  }

  return useReactCreateRoot
    ? // use the new createRoot API with React >= 18. The old one is backwards compatible, but will warn on develop.
      dedent(`import { createRoot } from "${reactDomCdnLocation}/client";
              import React from "${reactCdnLocation}";
              import Component from "${fileRelativePath}";
              var container = document.getElementById("root");
              var root = createRoot(container);
              root.render(React.createElement(Component, null));`)
    : // use the old ReactDOM.render API with React < 18.
      dedent(`import ReactDOM from "${reactDomCdnLocation}";
              import React from "${reactCdnLocation}";
              import Component from "${fileRelativePath}";
              var DOMRoot = document.getElementById("root");
              ReactDOM.render(React.createElement(Component, null), DOMRoot);`);
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

export const indexFile = `
<!DOCTYPE html>
<html>
  <body>
    <div id="root"></div>
  </body>
</html>
`;

export async function createIndex({
  paths,
  metafile,
  replacements,
  includeRuntime,
  indexContent,
  includeTrampoline,
}: {
  paths: Paths;
  metafile: esbuild.Metafile | undefined;
  replacements: Record<string, string>;
  includeRuntime: boolean;
  indexContent?: string;
  includeTrampoline?: boolean;
}): Promise<string> {
  const index =
    indexContent ?? (await fs.readFile(paths.appHtml, { encoding: 'utf-8' }));
  const cssEntryPoint = metafile
    ? normalizeToPosix(getEntryPoint(paths, metafile, '.css'))
    : undefined;
  const jsEntryPoint = metafile
    ? normalizeToPosix(getEntryPoint(paths, metafile, '.js'))
    : undefined;

  return compileIndex({
    indexContent: index,
    cssEntryPoint,
    jsEntryPoint,
    replacements,
    includeRuntime,
    includeTrampoline,
  });
}

export function createSyntheticIndex({
  cssEntryPoint,
  replacements,
  styleImports,
}: {
  cssEntryPoint: string | undefined;
  replacements: Record<string, string>;
  styleImports?: Set<string>;
}): string {
  return compileIndex({
    indexContent: indexFile,
    cssEntryPoint,
    replacements,
    includeTrampoline: true,
    styleImports,
  });
}

function compileIndex({
  indexContent,
  cssEntryPoint,
  jsEntryPoint,
  replacements,
  includeRuntime,
  includeTrampoline,
  styleImports,
}: {
  indexContent: string;
  cssEntryPoint?: string;
  jsEntryPoint?: string;
  replacements: Record<string, string>;
  includeRuntime?: boolean;
  includeTrampoline?: boolean;
  styleImports?: Set<string>;
}) {
  const page = parse5.parse(indexContent);
  const html = page.childNodes.find(
    (node) => node.nodeName === 'html',
  ) as parse5.Element;
  const head = html.childNodes.find(
    (node) => node.nodeName === 'head',
  ) as parse5.Element;
  const body = html.childNodes.find(
    (node) => node.nodeName === 'body',
  ) as parse5.Element;

  if (styleImports) {
    [...styleImports].forEach((importUrl) =>
      head.childNodes.push(
        ...parse5.parseFragment(
          `<link rel="stylesheet" href="${importUrl}"></script>`,
        ).childNodes,
      ),
    );
  }

  if (cssEntryPoint) {
    head.childNodes.push(
      ...parse5.parseFragment(
        `<link rel="stylesheet" href="%PUBLIC_URL%/${cssEntryPoint}"></script>`,
      ).childNodes,
    );
  }

  if (jsEntryPoint) {
    body.childNodes.push(
      ...parse5.parseFragment(
        `<script type="module" src="%PUBLIC_URL%/${jsEntryPoint}"></script>`,
      ).childNodes,
    );
  }

  if (includeTrampoline) {
    body.childNodes.push(
      ...parse5.parseFragment(
        `<script type="module" src="%PUBLIC_URL%/static/js/_trampoline.js"></script>`,
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
