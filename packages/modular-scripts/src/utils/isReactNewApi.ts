import semver from 'semver';
import type { Dependency } from '@schemastore/package';

export function isReactNewApi(manifest: Dependency): boolean {
  // React >= 18 needs a different way of instantiating rendering. Find out if the project needs it.
  const reactVersion = manifest?.['react'];
  return Boolean(reactVersion && semver.gte(reactVersion, '18.0.0'));
}
