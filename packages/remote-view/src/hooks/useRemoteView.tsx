import React, { useContext, useEffect, useState } from 'react';
import { ErrorContext, ViewsContext } from '../context';
import { loading } from '../utils/symbol';
import { dynamicallyImport } from '../utils/dynamicallyImport';
import { RemoteViewError } from '../utils/remoteViewError';
import 'isomorphic-fetch';

import type { ManifestCheck } from '../types';
import type { MicrofrontendManifest } from '@modular-scripts/modular-types';

async function loadRemoteView(
  baseUrl: string,
  loadWithIframeFallback?: ManifestCheck,
): Promise<React.ComponentType | void> {
  let manifest: MicrofrontendManifest | undefined;
  try {
    const response = await fetch(`${baseUrl}/package.json`);
    manifest = (await response.json()) as MicrofrontendManifest;
  } catch (e) {
    throw new RemoteViewError(
      `Unable to fetch and parse package.json for package at url "${baseUrl}"`,
      baseUrl,
    );
  }
  const type = manifest.modular?.type;
  const unsupportedType = !type || (type !== 'esm-view' && type !== 'app');

  if (unsupportedType) {
    throw new RemoteViewError(
      `Can't load package "${
        manifest.name
      }" at url "${baseUrl}" because type is missing or not supported: "${
        type || JSON.stringify(type)
      }"`,
      baseUrl,
    );
  }

  // Load with iframe if type is app or host decides to use fallback
  if (
    type === 'app' ||
    (loadWithIframeFallback && loadWithIframeFallback(manifest))
  ) {
    const iframeTitle = manifest.name;
    return () => <iframe title={iframeTitle} src={`${baseUrl}/index.html`} />;
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
  const [views, setViews] = useContext(ViewsContext);
  const [, setError] = useContext(ErrorContext);
  const [thrown, setThrown] = useState<string>();
  const currentView = views[baseUrl];

  useEffect(() => {
    if (currentView === loading) {
      return;
    }

    if (currentView === undefined) {
      setViews((prev) => ({ ...prev, [baseUrl]: loading }));

      void loadRemoteView(baseUrl, loadWithIframeFallback)
        .then((LoadedView) => {
          LoadedView &&
            setViews((prev) => ({ ...prev, [baseUrl]: LoadedView }));
        })
        .catch((err: Error) => {
          setThrown(err.message);
        });
    }
  }, [currentView, baseUrl, setViews, loadWithIframeFallback]);

  // Syncronously throw any errors that happened during `loadRemoteView()`
  // This is required to trigger error boundaries correctly (React cannot catch async throws)
  if (thrown) {
    const err = new RemoteViewError(thrown, baseUrl);
    setError(() => err);
    throw err;
  }

  // Initial render (loading has not yet started)
  if (currentView === undefined) {
    // setViews((prev) => ({ ...prev, [baseUrl]: loading }));
    return null;
  }

  // Loading render
  if (currentView === loading) {
    return null;
  }

  return currentView;
};
