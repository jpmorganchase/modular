import * as esbuild from 'esbuild';
import * as fs from 'fs-extra';
import * as parse5 from 'parse5';
import semver from 'semver';
import dedent from 'dedent';
import escapeStringRegexp from 'escape-string-regexp';
import minimize from 'html-minifier-terser';
import type { ModularType } from '@modular-scripts/modular-types';
import getModularRoot from '../../utils/getModularRoot';
import * as path from 'path';
import { normalizeToPosix } from './utils/formatPath';
import { Element } from 'parse5/dist/tree-adapters/default';
import getClientEnvironment from './config/getClientEnvironment';
import type { Dependency } from '@schemastore/package';
import { Paths } from '../common-scripts/determineTargetPaths';

type FileType = '.css' | '.js';

const indexFileTemplate = dedent(`
<!DOCTYPE html>
<html>
  <body>
    <div id="root"></div>
  </body>
</html>
`);
interface WriteFilesArguments {
  paths: Paths;
  cssEntryPoint?: string;
  jsEntryPoint: string;
  styleImports?: Set<string>;
  importMap: Map<string, string>;
  externalResolutions: Dependency;
  modularType: Extract<ModularType, 'app' | 'esm-view'>;
}

/**
 * @typedef {Object} WriteFilesArguments
 * @property {Paths} paths - list of paths relative to your application or esm-view
 * @property {string} cssEntryPoint - the name of your css entrypoint file
 * @property {string} jsEntryPoint - the name of your js entrypoint file
 * @property {Set<string>} styleImports - a set containing global style import URLs
 * @property {Map<string, string>} importMap - a map from package name to CDN URL
 * @property {Dependency} externalResolutions - a record of external resolutions and their versions
 * @property {Extract<ModularType, 'app' | 'esm-view'>;} modularType - Modular type, can be "app" or "esm-view"
 */

/**
 * Write `index.html` in the `appBuild` directory specified in `paths`,
 * linking the provided entrypoints (`jsEntryPoint` and `cssEntryPoint`) into it;
 * optionally write a `/static/js/_trampoline.js` trampoline file if `modularType` is "esm-view"
 * and link it in the `index.html`, along with the global `styleImports`.
 * The trampoline file is compatible with the version of React specified in `externalResolutions`.
 * @param  {WriteFilesArguments} arguments - a {@link WriteFilesArguments} object
 * @return {Promise<void>}
 */

export async function writeOutputIndexFiles({
  paths,
  cssEntryPoint,
  jsEntryPoint,
  styleImports,
  importMap,
  externalResolutions,
  modularType,
}: WriteFilesArguments): Promise<void> {
  const indexContent = fs.existsSync(paths.appHtml)
    ? await fs.readFile(paths.appHtml, { encoding: 'utf-8' })
    : indexFileTemplate;

  const env = getClientEnvironment(paths.publicUrlOrPath.slice(0, -1));

  const indexConfiguration = {
    indexContent,
    cssEntryPoint,
    jsEntryPoint,
    styleImports,
    includeTrampoline: modularType === 'esm-view',
    includeRuntime: false,
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

export async function createStartIndex({
  paths,
  metafile,
  replacements,
  styleImports,
  isApp,
}: {
  paths: Paths;
  metafile: esbuild.Metafile | undefined;
  replacements: Record<string, string>;
  styleImports?: Set<string>;
  isApp: boolean;
}): Promise<string> {
  const indexContent = (await fs.pathExists(paths.appHtml))
    ? await fs.readFile(paths.appHtml, { encoding: 'utf-8' })
    : indexFileTemplate;
  const cssEntryPoint = metafile
    ? normalizeToPosix(getEntryPoint(paths, metafile, '.css'))
    : undefined;
  const jsEntryPoint = metafile
    ? normalizeToPosix(getEntryPoint(paths, metafile, '.js'))
    : undefined;

  const configuration = {
    indexContent,
    cssEntryPoint,
    jsEntryPoint,
    replacements,
    includeRuntime: true,
    includeTrampoline: !isApp,
    styleImports,
  };

  return compileIndex(configuration);
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
