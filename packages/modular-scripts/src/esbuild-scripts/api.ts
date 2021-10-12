import * as fs from 'fs-extra';
import * as parse5 from 'parse5';
import escapeStringRegexp from 'escape-string-regexp';

import { Paths } from '../utils/createPaths';

export async function createIndex(
  paths: Paths,
  replacements: Record<string, string>,
  includeRuntime: boolean,
): Promise<string> {
  const index = await fs.readFile(paths.appHtml, { encoding: 'utf-8' });
  const page = parse5.parse(index);
  const html = page.childNodes.find(
    (node) => node.nodeName === 'html',
  ) as parse5.Element;
  const head = html.childNodes.find(
    (node) => node.nodeName === 'head',
  ) as parse5.Element;
  head.childNodes.push(
    ...parse5.parseFragment(
      `<link rel="stylesheet" href="%PUBLIC_URL%/index.css"></script>`,
    ).childNodes,
  );
  const body = html.childNodes.find(
    (node) => node.nodeName === 'body',
  ) as parse5.Element;
  body.childNodes.push(
    ...parse5.parseFragment(
      `<script type="module" src="%PUBLIC_URL%/index.js"></script>`,
    ).childNodes,
  );

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
