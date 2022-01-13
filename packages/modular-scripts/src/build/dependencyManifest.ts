import * as path from 'path';
import { Project } from 'ts-morph';
// import type { CoreProperties } from '@schemastore/package';
import getModularRoot from '../utils/getModularRoot';
import getWorkspaceInfo from '../utils/getWorkspaceInfo';

const packageNameMatcher =
  /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*/;

// We need to get dependencies from source, since the package.json dependencies could be hosted
function getDependenciesFromSource(workspaceLocation: string) {
  const project = new Project();
  project.addSourceFilesAtPaths(
    path.join(
      getModularRoot(),
      workspaceLocation,
      'src/**/*{.d.ts,.ts,.js,.jsx,.tsx}',
    ),
  );
  return new Set(
    project.getSourceFiles().flatMap((sourceFile) =>
      sourceFile
        .getImportDeclarations()
        .map(
          (declaration) =>
            declaration
              .getModuleSpecifierValue()
              .match(packageNameMatcher)?.[0],
        )
        .filter(Boolean),
    ),
  );
}

export async function generateDependencyManifest(target: string) {
  const workspace = await getWorkspaceInfo();
  const workspaceLocation = workspace[target].location;
  const dependencies = getDependenciesFromSource(workspaceLocation);
  console.log(dependencies);
}
