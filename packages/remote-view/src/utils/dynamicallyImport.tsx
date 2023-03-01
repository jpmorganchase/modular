import type { View } from '../types';

/**
 * Performs a dynamic (i.e. runtime) import of a remote ESM View
 * @param baseUrl e.g. http://cdn.example.com/components/esm-view-card
 * @param module e.g. /static/js/main.f5af2115.js
 *
 * Note that we cast to `View`, i.e. assume a React component is returned, but this is not guaranteed.
 */
export async function dynamicallyImport(baseUrl: string, module: string) {
  const { default: LoadedView } = (await import(
    /* webpackIgnore: true */ `${baseUrl}${module}`
  )) as View;

  return LoadedView;
}
