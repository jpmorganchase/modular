import React, { useState } from 'react';
import { ErrorContext, ViewsContext } from '../context';
import { RemoteViewError } from '../utils/remoteViewError';

import type { PropsWithChildren } from 'react';
import type { MicroFrontendState } from '../types';

export const RemoteViewProvider = ({
  children,
}: PropsWithChildren<unknown>): JSX.Element => {
  const currentViews = useState<MicroFrontendState>({});
  const currentError = useState<RemoteViewError>();

  return (
    <ViewsContext.Provider value={currentViews}>
      <ErrorContext.Provider value={currentError}>
        {children}
      </ErrorContext.Provider>
    </ViewsContext.Provider>
  );
};
