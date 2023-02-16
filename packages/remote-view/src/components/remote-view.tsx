import React from 'react';
import { useRemoteView } from '../hooks/useRemoteView';

import type { ManifestCheck } from '../types';

export const RemoteView = ({
  baseUrl,
  loadWithIframeFallback,
}: {
  baseUrl: string;
  loadWithIframeFallback?: ManifestCheck;
}): JSX.Element => {
  const ViewComponent = useRemoteView(baseUrl, loadWithIframeFallback);

  return (ViewComponent && <ViewComponent />) || <div>Loading</div>;
};
