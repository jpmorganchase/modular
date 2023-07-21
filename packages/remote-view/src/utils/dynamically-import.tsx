import type { View } from '../types';

/**
 * Performs a dynamic (i.e. runtime) import of a remote ESM View
 *
 * Note that we cast to `View`, i.e. assume a React component is returned, but this is not guaranteed.
 */
export async function dynamicallyImport(remoteModuleUrl: string) {
  const { default: LoadedView } = (await import(
    /* webpackIgnore: true */ remoteModuleUrl
  )) as View;

  return LoadedView;
}
