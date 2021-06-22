import { JSONSchemaForNPMPackageJsonFiles as PackageJson } from '@schemastore/package';
import * as path from 'path';
import fs from 'fs-extra';
import findUp from 'find-up';
import * as Babel from '@babel/core';
import { ImportDeclaration, Program, Statement } from '@babel/types';
import { default as _template } from '@babel/template';
import { createMacro, MacroHandler } from 'babel-plugin-macros';
import { LazyExoticComponent, ComponentType } from 'react';
import execa from 'execa';

type PackageType = 'app' | 'view' | 'root' | 'package';

type ModularPackageJson = PackageJson & {
  modular?: {
    type: PackageType;
  };
};

const modularRoot = findUp.sync((directory) => {
  const packageJsonPath = path.join(directory, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const pkgJSON = fs.readJsonSync(packageJsonPath) as ModularPackageJson;
    if (pkgJSON.modular && pkgJSON.modular.type === 'root') {
      return packageJsonPath;
    }
  }
  return;
});

if (!modularRoot) {
  throw new Error('This macro can only be used inside a modular project.');
}

const packageNames = [];

const modularRootDir = path.dirname(modularRoot);
const output = execa.sync('yarnpkg', ['workspaces', 'info'], {
  all: true,
  reject: false,
  cwd: modularRootDir,
  cleanup: true,
});

const workspaces: Array<[string, { location: string }]> = Object.entries(
  JSON.parse(output.stdout),
);

for (const [name, { location }] of workspaces) {
  const pkgJson = fs.readJSONSync(
    path.join(modularRootDir, location, 'package.json'),
  ) as ModularPackageJson;
  if (
    pkgJson &&
    pkgJson.private !== true &&
    pkgJson.modular &&
    pkgJson.modular.type === 'view'
  ) {
    packageNames.push(name);
  }
}

const viewsMap = `({
  ${packageNames
    .map(
      (packageName) =>
        `'${packageName}': __lazy__(() => import('${packageName}'))`,
    )
    .join(',\n  ')}
})`;

const views: MacroHandler = ({ references, babel }) => {
  const r = references as { default?: Babel.NodePath<ImportDeclaration>[] };
  if (!r.default || r.default.length === 0) {
    return;
  }

  const template = (babel as { template: typeof _template }).template;

  const nodePath = r.default[0];
  const hub = nodePath.hub;
  const node = hub.getScope()?.path.node as Program;
  const body = node.body;
  const rootStatement: Statement = template.ast(
    `const __views__map__ = ${viewsMap};`,
  ) as Statement;
  body.unshift(rootStatement);

  if (packageNames.length > 0) {
    const packageStatement: Statement = template.ast(
      "import {lazy as __lazy__} from 'react';",
    ) as Statement;
    body.unshift(packageStatement);
  }

  r.default.forEach((ref) => ref.replaceWithSourceString(`__views__map__`));
};

interface ViewMap<T = unknown> {
  [packageName: string]: LazyExoticComponent<ComponentType<T>>;
}

const viewMap = createMacro(views) as ViewMap;

export default viewMap;
