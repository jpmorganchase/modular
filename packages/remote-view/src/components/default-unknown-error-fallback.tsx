import React from 'react';

interface Props {
  error: Error;
}

/**
 * Used to catch unknown errors, i.e. errors that are not RemoteViewErrors.
 * This handles errors of any type within a <RemoteView /> tree, assuming the user is using the <RemoteViewErrorBoundary />
 */
export function DefaultUnknownErrorFallback({ error }: Props) {
  const { message } = error;

  return (
    <div>
      <span>Something went wrong</span>
      {message && <pre>{message}</pre>}
    </div>
  );
}
