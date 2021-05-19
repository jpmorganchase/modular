import execa from 'execa';
import getModularRoot from './getModularRoot';
const modularRoot = getModularRoot();

let workspaces: { [name: string]: { location: string } };

export function getAllWorkspaces(): typeof workspaces {
  if (!workspaces) {
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
