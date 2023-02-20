import React, { useContext, useEffect, useState } from 'react';
import { views } from '../context';
import { loading } from '../utils/symbol';
import { dynamicallyImport } from '../utils/dynamicallyImport';
import 'isomorphic-fetch';

import type { ManifestCheck } from '../types';
import type { MicrofrontendManifest } from '@modular-scripts/modular-types';

async function loadRemoteView(
  baseUrl: string,
  loadWithIframeFallback?: ManifestCheck,
): Promise<React.ComponentType | void> {
  const response = await fetch(`${baseUrl}/package.json`);
  const manifest = (await response.json()) as MicrofrontendManifest;
  const type = manifest?.modular?.type;
  const unsupportedType = !type || (type !== 'esm-view' && type !== 'app');

  // In most scenarios, we want to throw, which will trigger the Error Boundary
  // In some cases (e.g. the jest environment), it's simpler to display the default error fallback
  if (unsupportedType) {
    throw new TypeError(
      `Can't load package ${
        manifest.name
      } because type is missing or not supported: "${
        type || JSON.stringify(type)
      }"`,
    );
  }

  // Load with iframe if type is app or host decides to use fallback
  if (
    type === 'app' ||
    (loadWithIframeFallback && loadWithIframeFallback(manifest))
  ) {
    return () => <iframe title={manifest.name} src={`${baseUrl}/index.html`} />;
  }

  // Load global CSS
  manifest.styleImports?.forEach(injectRemoteCss);

  // Load microfrontend's local style
  if (manifest.style) {
    injectRemoteCss(`${baseUrl}/${manifest.style}`);
  }

  // Dynamically import ESM entrypoint
  if (manifest.module) {
    const LoadedView = await dynamicallyImport(baseUrl, manifest.module);

    return LoadedView;
  }
}

function injectRemoteCss(url: string) {
  const node = document.head;

  if (node.querySelector(`link[href="${url}"]`)) {
    return;
  }

  /**
   * Warning!
   * <RemoteView /> should only be used to render content from a trusted source.
   * `url` should never be the result of, or exposed to, end user input.
   */
  node.insertAdjacentHTML(
    'beforeend',
    `<link rel='stylesheet' href='${url}' />`,
  );
}

export const useRemoteView = (
  baseUrl: string,
  loadWithIframeFallback?: ManifestCheck,
): React.ComponentType | null => {
  const [state, setState] = useContext(views);
  const [thrown, setThrown] = useState<string>();
  const current = state[baseUrl];

  useEffect(() => {
    if (current !== undefined) {
      return;
    }

    void loadRemoteView(baseUrl, loadWithIframeFallback)
      .then((LoadedView) => {
        LoadedView && setState((old) => ({ ...old, [baseUrl]: LoadedView }));
      })
      .catch((err: TypeError) => {
        setThrown(err.message);
      });
  }, [current, baseUrl, setState, loadWithIframeFallback]);

  // Syncronously throw any errors that happened during `loadRemoteView()`
  // This is required to trigger error boundaries correctly (React cannot catch async throws)
  if (thrown) {
    throw new Error(thrown);
  }

  if (current === undefined) {
    // setState((prev) => ({ ...prev, [baseUrl]: loading }));
    return null;
  }

  if (current === loading) {
    return null;
  }

  return current;
};
