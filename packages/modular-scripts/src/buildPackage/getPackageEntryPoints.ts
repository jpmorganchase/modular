import getPackageMetadata from './getPackageMetadata';

export function getPackageEntryPoints(packagePath: string): {
  main: string;
  compilingBin: boolean;
} {
  const { packageJsonsByPackagePath } = getPackageMetadata();
  const packageJson = packageJsonsByPackagePath[packagePath];

  let compilingBin = false;
  let main: string | undefined;

  if (packageJson.main) {
    main = packageJson.main;
  } else {
    if (packageJson.bin) {
      const bins: string[] = Object.values(packageJson.bin) as string[];
      if (bins.length === 1) {
        compilingBin = true;
        main = bins[0];
      } else {
        throw new Error(
          `package.json at ${packagePath} contains multiple "bin" values, bailing...`,
        );
      }
    } else {
      throw new Error(
        `package.json at ${packagePath} does not have a "main" or "bin" field, bailing...`,
      );
    }
  }

  return { main, compilingBin };
}
