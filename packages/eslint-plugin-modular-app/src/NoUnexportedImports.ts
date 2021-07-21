import { JSONSchemaForNPMPackageJsonFiles as PackageJson } from '@schemastore/package';
import * as ESLint from 'eslint';
import * as ESTree from 'estree'; // eslint-disable-line  import/no-unresolved
import * as fs from 'fs-extra';
import * as path from 'path';

const buildPackageExports = (): Record<string, string[]> => {
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
    .reduce((agg, pkg) => {
      if (pkg.name && pkg.exports) {
        const absoluteModulePaths: string[] = Object.keys(
          pkg.exports || {},
        ).map((p) => {
          return p.replace('.', pkg.name as string);
        });
        return {
          ...agg,
          [pkg.name]: absoluteModulePaths,
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
  modularMap: Record<string, string[]>,
) => {
  const importedPath = packageName.split('/');
  const importedPackage =
    // scoped package?
    importedPath[0][0] === '@'
      ? `${importedPath[0]}/${importedPath[1]}`
      : // non-scoped
        importedPath[0];
  if (
    modularMap[importedPackage] &&
    !modularMap[importedPackage].includes(packageName)
  ) {
    context.report({
      node,
      message: `${packageName} is not exported as an available modular from  available for import. Module cannot be found.`,
    });
  }
};

const rule: ESLint.Rule.RuleModule = {
  create(context: ESLint.Rule.RuleContext) {
    const modularMap: Record<string, string[]> = buildPackageExports();
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
  },
};

export default rule;
