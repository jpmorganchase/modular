export const packageRegex =
  /^(@[a-z0-9-~][a-z0-9-._~]*)?\/?([a-z0-9-~][a-z0-9-._~]*)\/?(.*)/;

export function parsePackageName(name: string): {
  dependencyName: string;
  scope?: string;
  module: string;
  submodule?: string;
} {
  const parsedName = packageRegex.exec(name);
  if (!parsedName) {
    throw new Error(`Can't parse package name: ${name}`);
  }
  const [scope, module, submodule] = parsedName.slice(1);
  const dependencyName = (scope ? `${scope}/` : '') + module;
  return { dependencyName, scope, module, submodule };
}
