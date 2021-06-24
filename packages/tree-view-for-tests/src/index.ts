import fs from 'fs';
import path from 'path';
import asciiTree from 'ascii-tree';
import hash from '@emotion/hash';

function times(str: string, length: number) {
  return Array.from({ length }, () => str).join('');
}

const defaultIgnores = [
  'node_modules',
  '.git',
  '.DS_Store',
  'build',
  '__snapshots__',
];
const defaultHashIgnores = [
  // adding lockfiles here because it can be different
  // on different runs; since we install the latest versions
  // of some packages when making a repository
  'yarn.lock',
  'package-lock.json',
  // adding package.json/CHANGELOG.md files since they change on releases
  'package.json',
  'CHANGELOG.md',
];

function tree(
  _path: string,
  level = 1,
  options = {
    ignores: defaultIgnores,
    hashIgnores: defaultHashIgnores,
  },
): string {
  const stat = fs.statSync(_path);
  if (stat.isDirectory()) {
    const children = fs.readdirSync(_path).sort();
    const dirArr = _path.split(/[/|\\]/);
    const dir = dirArr[dirArr.length - 1];
    // todo - handle symlinks, etc
    return `${times('#', level)}${dir}\n${children
      .filter((child: string) => !options.ignores.includes(child))
      .map((child: string) => tree(path.join(_path, child), level + 1, options))
      .join('\n')}`;
  } else {
    return [
      `${times('#', level)}${path.basename(_path)}`,
      options.hashIgnores.includes(path.basename(_path))
        ? undefined
        : `#${hash(fs.readFileSync(_path, 'utf8').replace(/\r/gm, ''))}`,
    ]
      .filter(Boolean)
      .join(' ');
  }
}

export default function generate(_path: string): string {
  return asciiTree.generate(tree(_path));
}
