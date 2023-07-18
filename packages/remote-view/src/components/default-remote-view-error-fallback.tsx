import React from 'react';
import { RemoteViewError } from '../utils/remote-view-error';

export function DefaultRemoteViewErrorFallback({
  error,
}: {
  error: RemoteViewError;
}) {
  const { message, remoteViewUrl } = error;
  const formattedMsg = `Something went wrong for module at URL "${remoteViewUrl}".`;

  return (
    <div>
      <span>{formattedMsg}</span>
      {message && <pre>{message}</pre>}
    </div>
  );
}
