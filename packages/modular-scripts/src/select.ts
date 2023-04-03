import {
  selectBuildableSubsets,
  selectWorkspaces,
} from './utils/selectWorkspaces';
import actionPreflightCheck from './utils/actionPreflightCheck';
import { getAllWorkspaces } from './utils/getAllWorkspaces';
import getModularRoot from './utils/getModularRoot';

async function select({
  changed,
  compareBranch,
  ancestors,
  descendants,
  buildable,
  selectedPackages,
}: {
  changed: boolean;
  compareBranch?: string;
  ancestors: boolean;
  descendants: boolean;
  buildable: boolean;
  selectedPackages: string[];
}) {
  const modularRoot = getModularRoot();
  const [allWorkspacePackages] = await getAllWorkspaces(modularRoot);

  const targets =
    !selectedPackages.length && !changed
      ? [...allWorkspacePackages.keys()]
      : selectedPackages;

  const selected = buildable
    ? await selectBuildableSubsets({
        targets,
        changed,
        compareBranch,
        descendants,
        ancestors,
        dangerouslyIgnoreCircularDependencies: false,
      })
    : await selectWorkspaces({
        targets,
        changed,
        compareBranch,
        descendants,
        ancestors,
      });

  console.log(JSON.stringify(selected, null, 2));
}

export default actionPreflightCheck(select);
