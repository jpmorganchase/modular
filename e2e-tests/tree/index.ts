import fs from 'fs';
import path from 'path';
import asciiTree from 'ascii-tree';
import hash from '@emotion/hash';

function times(str: string, length: number) {
  return Array.from({ length }, () => str).join('');
}

const ignores = [
  'node_modules',
  '.git',
  '.DS_Store',
  // adding lockfiles here because it can be different
  // on different runs; since we install the latest versions
  // of some packages when making a repository
  'yarn.lock',
  'package-lock.json',
];

function tree(_path: string, level = 1): string {
  const stat = fs.statSync(_path);
  if (stat.isDirectory()) {
    const children = fs.readdirSync(_path);
    const dirArr = _path.split('/');
    const dir = dirArr[dirArr.length - 1];
    // todo - should these be sorted?
    // todo - handle symlinks, etc
    return `${times('#', level)}${dir}\n${children
      .filter((child) => !ignores.includes(child))
      .map((child) => tree(path.join(_path, child), level + 1))
      .join('\n')}`;
  } else {
    return `${times('#', level)}${path.basename(_path)} #${hash(
      fs.readFileSync(_path, 'utf8'),
    )}`;
  }
}

export default function generate(_path: string): string {
  return asciiTree.generate(tree(_path));
}
