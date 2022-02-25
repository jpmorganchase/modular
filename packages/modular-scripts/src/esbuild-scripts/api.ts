import type * as esbuild from 'esbuild';
import * as fs from 'fs-extra';
import * as parse5 from 'parse5';
import escapeStringRegexp from 'escape-string-regexp';

import type { Paths } from '../utils/createPaths';
import getModularRoot from '../utils/getModularRoot';
import * as path from 'path';

type FileType = '.css' | '.js';

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
  metafile: esbuild.Metafile,
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

  const cssEntryPoint = getEntryPoint(paths, metafile, '.css');
  const jsEntryPoint = getEntryPoint(paths, metafile, '.js');

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
