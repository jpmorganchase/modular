const packageRegex =
  /^(@[a-z0-9-~][a-z0-9-._~]*)?\/?([a-z0-9-~][a-z0-9-._~]*)\/?(.*)/;

export function parsePackageName(name: string) {
  const parsedName = packageRegex.exec(name);
  if (!parsedName) {
    return;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, scope, module, submodule] = parsedName;
  const dependencyName = (scope ? `${scope}/` : '') + module;
  return { dependencyName, scope, module, submodule };
}
