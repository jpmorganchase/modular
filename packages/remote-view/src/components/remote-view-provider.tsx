import React, { useState } from 'react';
import { ErrorContext, ViewsContext } from '../context';
import { RemoteViewError } from '../utils/remoteViewError';

import type { PropsWithChildren } from 'react';
import type { MicroFrontendState } from '../types';

export const RemoteViewProvider = ({
  children,
}: PropsWithChildren<unknown>): JSX.Element => {
  const viewState = useState<MicroFrontendState>({});
  const errorState = useState<RemoteViewError>();

  return (
    <ViewsContext.Provider value={viewState}>
      <ErrorContext.Provider value={errorState}>
        {children}
      </ErrorContext.Provider>
    </ViewsContext.Provider>
  );
};
