import { JSONSchemaForNPMPackageJsonFiles as PackageJson } from '@schemastore/package';
import * as ESLint from 'eslint';
import * as ESTree from 'estree'; // eslint-disable-line  import/no-unresolved
import * as fs from 'fs-extra';
import * as path from 'path';

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
  for (const modularPackage in modularMap) {
    if (packageName.startsWith(modularPackage)) {
      if (modularMap[modularPackage]) {
        context.report({
          node,
          message: `${modularPackage} is marked as private and cannot be dependended on`,
        });
      }
    }
  }
};

const rule: ESLint.Rule.RuleModule = {
  create(context) {
    const modularMap: Record<string, boolean> = buildModularMap();

    return {
      ImportDeclaration(node) {
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
    };
  },
};

export default rule;
