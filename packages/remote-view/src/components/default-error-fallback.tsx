import React from 'react';

interface Props {
  message: string | undefined;
}

export function DefaultErrorFallback({ message }: Props) {
  const suffix = message ? `: ${message}` : '';
  return (
    <div data-testid="remote-view-default-error-fallback">
      Something went wrong{suffix}
    </div>
  );
}
