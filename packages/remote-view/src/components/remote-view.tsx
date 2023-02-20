import React from 'react';
import { useRemoteView } from '../hooks/useRemoteView';

import type { ManifestCheck } from '../types';
interface Props {
  baseUrl: string;
  loadWithIframeFallback?: ManifestCheck;
  loading?: JSX.Element;
}

function DefaultLoading() {
  return <div data-testid="remote-view-loading">Loading</div>;
}

export function RemoteView({
  baseUrl,
  loadWithIframeFallback,
  loading,
}: Props) {
  const ViewComponent = useRemoteView(baseUrl, loadWithIframeFallback);
  const loadingOutput = loading ? loading : <DefaultLoading />;

  return (ViewComponent && <ViewComponent />) || loadingOutput;
}
