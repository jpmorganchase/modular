import * as path from 'path';
import { Project } from 'ts-morph';
// import type { CoreProperties } from '@schemastore/package';
import getModularRoot from '../utils/getModularRoot';
import getWorkspaceInfo from '../utils/getWorkspaceInfo';

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
  // TODO extract the dependency name without the path
  return new Set(
    project.getSourceFiles().flatMap(
      (sourceFile) =>
        sourceFile
          .getImportDeclarations()
          .map((declaration) => declaration.getModuleSpecifierValue())
          .filter((dep) => !dep.startsWith('.')), // no relative dependencies
    ),
  );
}

export async function generateDependencyManifest(target: string) {
  const workspace = await getWorkspaceInfo();
  const workspaceLocation = workspace[target].location;
  const dependencies = getDependenciesFromSource(workspaceLocation);
  console.log(dependencies);
}
