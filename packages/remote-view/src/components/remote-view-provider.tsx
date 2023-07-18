import React, { useEffect, useMemo, useState } from 'react';
import { ErrorContext, ViewsContext } from '../context';
import { RemoteViewError } from '../utils/remote-view-error';
import { dynamicallyImport } from '../utils/dynamically-import';
import { loading } from '../utils/symbol';
import {
  esmViewUrlIsValid,
  getRemoteAssetUrl,
  getRemotePackageJsonUrl,
} from '../utils/get-urls';
import type {
  ManifestCheck,
  RemoteViewErrorsContext,
  RemoteViewsContext,
} from '../types';
import type { MicrofrontendManifest } from '@modular-scripts/modular-types';

interface Props {
  children: React.ReactNode;
  urls: string[];
  loadWithIframeFallback?: ManifestCheck;
}

async function loadRemoteView(
  baseUrl: string,
  loadWithIframeFallback?: ManifestCheck,
): Promise<React.ComponentType | void> {
  let manifest: MicrofrontendManifest | undefined;
  try {
    const packageJsonUrl = getRemotePackageJsonUrl(baseUrl);
    const response = await fetch(packageJsonUrl);
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
    const iframeUrl = getRemoteAssetUrl(baseUrl, '/index.html');
    return () => <iframe title={iframeTitle} src={iframeUrl} />;
  }

  // Load global CSS
  manifest.styleImports?.forEach(injectRemoteCss);

  // Load microfrontend's local style
  if (manifest.style) {
    const remoteStyleUrl = getRemoteAssetUrl(baseUrl, manifest.style);
    injectRemoteCss(remoteStyleUrl);
  }

  // Dynamically import ESM entrypoint
  if (manifest.module) {
    const remoteModuleUrl = getRemoteAssetUrl(baseUrl, manifest.module);
    const LoadedView = await dynamicallyImport(remoteModuleUrl);

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

export const RemoteViewProvider = ({
  children,
  urls,
  loadWithIframeFallback,
}: Props): JSX.Element => {
  const [views, setViews] = useState<RemoteViewsContext>({});
  const [errors, setErrors] = useState<RemoteViewErrorsContext>({});
  const existingUrls = useMemo(() => Object.keys(views), [views]);
  const dedupedUrls = useMemo(() => {
    const allUrls = Array.from(new Set([...existingUrls, ...urls]));
    return allUrls.filter((url) => !existingUrls.includes(url));
  }, [urls, existingUrls]);

  useEffect(() => {
    for (const url of dedupedUrls) {
      if (!esmViewUrlIsValid(url)) {
        setErrors({
          ...errors,
          [url]: new RemoteViewError(
            'Invalid URL for loading an ESM View',
            url,
          ),
        });

        continue;
      }
      setViews((prev) => ({ ...prev, [url]: loading }));

      void loadRemoteView(url, loadWithIframeFallback)
        .then((LoadedView) => {
          LoadedView && setViews((prev) => ({ ...prev, [url]: LoadedView }));
        })
        .catch((err: Error) => {
          setErrors({ ...errors, [url]: err });
        });
    }
  }, [dedupedUrls, setViews, loadWithIframeFallback, errors]);

  return (
    <ViewsContext.Provider value={views}>
      <ErrorContext.Provider value={errors}>{children}</ErrorContext.Provider>
    </ViewsContext.Provider>
  );
};
