import React, { useContext, useEffect } from 'react';
import { views } from '../context';
import { loading } from '../utils/symbol';
import 'isomorphic-fetch';

import type { ManifestCheck } from '../types';
import type { MicrofrontendManifest } from '@modular-scripts/modular-types';
import { dynamicallyImport } from '../utils/dynamicallyImport';

async function loadRemoteView(
  baseUrl: string,
  loadWithIframeFallback?: ManifestCheck,
): Promise<React.ComponentType | void> {
  const response = await fetch(`${baseUrl}/package.json`);
  const manifest = (await response.json()) as MicrofrontendManifest;
  const type = manifest?.modular?.type;

  if (!type || (type !== 'esm-view' && type !== 'app')) {
    throw new Error(
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
  const current = state[baseUrl];

  useEffect(() => {
    if (current !== undefined) {
      return;
    }

    void loadRemoteView(baseUrl, loadWithIframeFallback).then((LoadedView) => {
      LoadedView && setState((old) => ({ ...old, [baseUrl]: LoadedView }));
    });
  }, [current, baseUrl, setState, loadWithIframeFallback]);

  if (current === undefined) {
    // setState((prev) => ({ ...prev, [baseUrl]: loading }));
    return null;
  }

  if (current === loading) {
    return null;
  }

  return current;
};
