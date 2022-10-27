export const packageRegex =
  /^(@[a-z0-9-~][a-z0-9-._~]*)?\/?([a-z0-9-~][a-z0-9-._~]*)\/?(.*)/;

/**
 * @typedef {Object} ParsedPackage
 * @property {string} dependencyName - The package scope (if present) and name - example: "@scoped/pkg"
 * @property {string | undefined} scope - The package scope, if present - example: "@scoped"
 * @property {string} module - The package name, without scope - example: "pkg"
 * @property {string} submodule - The package submodule path, or empty string if not present - example: "sub/module/path/file"
 */

/**
 * Parse npm package name into its components
 * @param  {String} name  Package name - example: "@scoped/pkg/sub/module/path/file"
 * @return {ParsedPackage} The parsed package name.
 */

export function parsePackageName(name: string): {
  dependencyName: string;
  scope?: string;
  module: string;
  submodule: string;
} {
  const parsedName = packageRegex.exec(name);
  if (!parsedName) {
    throw new Error(`Can't parse package name: ${name}`);
  }
  const [scope, module, submodule] = parsedName.slice(1);
  const dependencyName = (scope ? `${scope}/` : '') + module;
  return { dependencyName, scope, module, submodule };
}
