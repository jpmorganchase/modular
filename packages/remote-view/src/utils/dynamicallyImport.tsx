import type { View } from '../types';

export async function dynamicallyImport(baseUrl: string, module: string) {
  const { default: LoadedView } = (await import(
    /* webpackIgnore: true */ `${baseUrl}${module}`
  )) as View;

  return LoadedView;
}
