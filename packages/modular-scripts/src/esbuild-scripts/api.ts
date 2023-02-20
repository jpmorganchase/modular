import * as esbuild from 'esbuild';
import * as fs from 'fs-extra';
import * as parse5 from 'parse5';
import semver from 'semver';
import dedent from 'dedent';
import escapeStringRegexp from 'escape-string-regexp';
import minimize from 'html-minifier-terser';
import type { ModularType } from '@modular-scripts/modular-types';
import type { Paths } from '../utils/createPaths';
import getModularRoot from '../utils/getModularRoot';
import * as path from 'path';
import { normalizeToPosix } from './utils/formatPath';
import { Element } from 'parse5/dist/tree-adapters/default';
import getClientEnvironment from '../esbuild-scripts/config/getClientEnvironment';
import type { Dependency } from '@schemastore/package';

type FileType = '.css' | '.js';

// TODO: Do not export and rename to "indexFileTemplate"
export const indexFile = dedent(`
<!DOCTYPE html>
<html>
  <body>
    <div id="root"></div>
  </body>
</html>
`);

// TODO: Move this + createViewTrampoline to the build directory, instead of esbuild
interface CreateIndexArguments {
  paths: Paths;
  cssEntryPoint?: string;
  jsEntryPoint: string;
  styleImports?: Set<string>;
  importMap: Map<string, string>;
  externalResolutions: Dependency;
  modularType: Extract<ModularType, 'app' | 'esm-view'>;
  isBuild: boolean;
}

export async function writeOutputIndexFile({
  paths,
  cssEntryPoint,
  jsEntryPoint,
  styleImports,
  importMap,
  externalResolutions,
  modularType,
  isBuild,
}: CreateIndexArguments) {
  const indexContent = fs.existsSync(paths.appHtml)
    ? await fs.readFile(paths.appHtml, { encoding: 'utf-8' })
    : indexFile;

  const env = getClientEnvironment(paths.publicUrlOrPath.slice(0, -1));

  const indexConfiguration = {
    indexContent,
    cssEntryPoint,
    jsEntryPoint,
    styleImports,
    includeTrampoline: modularType === 'esm-view',
    includeRuntime: !isBuild,
    replacements: env.raw,
  };

  const html = compileIndex(indexConfiguration);
  const minifiedHtml = await minimize.minify(html, {
    html5: true,
    collapseBooleanAttributes: true,
    collapseWhitespace: true,
    collapseInlineTagWhitespace: true,
    decodeEntities: true,
    minifyCSS: true,
    minifyJS: true,
    removeAttributeQuotes: false,
    removeComments: true,
    removeTagWhitespace: true,
  });

  await fs.writeFile(path.join(paths.appBuild, 'index.html'), minifiedHtml);

  if (modularType === 'esm-view') {
    const reactVersion = externalResolutions?.['react'];
    const useReactCreateRoot = Boolean(
      reactVersion && semver.gte(reactVersion, '18.0.0'),
    );

    const trampolineContent = createViewTrampoline({
      fileName: path.basename(jsEntryPoint),
      importMap,
      useReactCreateRoot,
    });

    const trampolinePath = `${paths.appBuild}/static/js/_trampoline.js`;
    await fs.writeFile(trampolinePath, trampolineContent);
  }
}

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

// TODO: this function goes away
export async function createIndex({
  paths,
  metafile,
  replacements,
  includeRuntime,
  indexContent,
  includeTrampoline,
  styleImports,
}: {
  paths: Paths;
  metafile: esbuild.Metafile | undefined;
  replacements: Record<string, string>;
  includeRuntime: boolean;
  indexContent?: string;
  includeTrampoline?: boolean;
  styleImports?: Set<string>;
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
    styleImports,
  });
}

// TODO: this function goes away
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

// TODO: this function should not be exported anymore
export function compileIndex({
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
  ) as Element;
  const head = html.childNodes.find(
    (node) => node.nodeName === 'head',
  ) as Element;
  const body = html.childNodes.find(
    (node) => node.nodeName === 'body',
  ) as Element;

  if (styleImports) {
    [...styleImports].forEach((importUrl) =>
      head.childNodes.push(
        ...parse5.parseFragment(`<link rel="stylesheet" href="${importUrl}" />`)
          .childNodes,
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
