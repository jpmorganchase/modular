import { JSONSchemaForNPMPackageJsonFiles as PackageJson } from '@schemastore/package';
import * as ESLint from 'eslint';
import * as ESTree from 'estree'; // eslint-disable-line  import/no-unresolved
import * as fs from 'fs-extra';
import * as path from 'path';
import findUp from 'find-up';

const buildModularMap = (): Record<string, boolean> => {
  return fs
    .readdirSync(path.join(process.cwd(), 'packages'))
    .map((dir) => path.join(process.cwd(), 'packages', dir, 'package.json'))
    .map<PackageJson>((f) => {
      try {
        return fs.readJsonSync(f) as PackageJson;
      } catch (e) {
        return {};
      }
    })
    .reduce<Record<string, boolean>>((agg, pkg) => {
      if (pkg && pkg.name) {
        return {
          ...agg,
          [pkg.name]: Boolean(pkg.private),
        };
      } else {
        return agg;
      }
    }, {});
};

const validatePackageUse = (
  context: ESLint.Rule.RuleContext,
  node: ESTree.Node,
  packageName: string,
  modularMap: Record<string, boolean>,
) => {
  if (modularMap[packageName]) {
    context.report({
      node,
      message: `${packageName} is marked as private and cannot be dependended on`,
    });
  }
};

type PackageType = 'app' | 'view' | 'package';

type ModularType = PackageType | 'root';

type ModularPackageJson = PackageJson & {
  modular?: {
    type: ModularType;
  };
};

function findUpPackageJson(cwd: string): string | undefined {
  return findUp.sync(
    (directory: string) => {
      const packageJsonPath = path.join(directory, 'package.json');
      if (findUp.sync.exists(packageJsonPath)) {
        return packageJsonPath;
      }
      return;
    },
    { type: 'file', allowSymlinks: false, cwd },
  );
}

const rule: ESLint.Rule.RuleModule = {
  create(context: ESLint.Rule.RuleContext) {
    const modularMap: Record<string, boolean> = buildModularMap();
    const fileName = context.getFilename();
    const pkgJson = findUpPackageJson(fileName);
    const appType =
      pkgJson &&
      (fs.readJsonSync(pkgJson) as ModularPackageJson).modular?.type === 'app';
    if (!appType) {
      return {
        ImportDeclaration(node: ESTree.ImportDeclaration) {
          validatePackageUse(
            context,
            node,
            String(node.source.value),
            modularMap,
          );
        },
        ImportExpression(node: ESTree.ImportExpression) {
          const source = node.source as ESTree.SimpleLiteral;
          validatePackageUse(context, node, String(source.value), modularMap);
        },
      } as ESLint.Rule.RuleListener;
    }
    return {};
  },
};

export default rule;
