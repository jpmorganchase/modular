import execa from 'execa';
import getModularRoot from './getModularRoot';

let workspaces: { [name: string]: { location: string } };

export function getAllWorkspaces(): typeof workspaces {
  if (!workspaces) {
    const modularRoot = getModularRoot();

    workspaces = JSON.parse(
      execa.sync('yarnpkg', ['workspaces', 'info'], {
        all: true,
        reject: false,
        cwd: modularRoot,
        cleanup: true,
      }).stdout,
    ) as { [name: string]: { location: string } };
  }
  return workspaces;
}
