import React from 'react';
import { useRemoteViewError } from '../hooks/useRemoteViewError';

export function DefaultErrorFallback() {
  const error = useRemoteViewError();
  if (!error) {
    throw new TypeError(
      `<RemoteView />'s default error fallback attempted to render without an error existing in ErrorContext. ` +
        `Ensure that you have wrapped any usage of <RemoteView /> with <RemoteViewProvider />.`,
    );
  }
  const { message, remoteViewUrl } = error;

  return (
    <div>
      <span>Something went wrong for module at URL "{remoteViewUrl}".</span>
      {message && <pre>{message}</pre>}
    </div>
  );
}
