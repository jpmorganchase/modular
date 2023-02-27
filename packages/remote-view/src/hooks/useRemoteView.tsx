import React, { useContext } from 'react';
import { ErrorContext, ViewsContext } from '../context';
import { loading } from '../utils/symbol';
import { RemoteViewError } from '../utils/remoteViewError';
import 'isomorphic-fetch';

export const useRemoteView = (baseUrl: string): React.ComponentType | null => {
  const views = useContext(ViewsContext);
  const errors = useContext(ErrorContext);
  const remoteViewError = errors[baseUrl];
  const currentView = views[baseUrl];

  if (remoteViewError) {
    throw new RemoteViewError(remoteViewError.message, baseUrl);
  }

  // Initial render (loading has not yet started)
  if (currentView === undefined) {
    return null;
  }

  // Loading render
  if (currentView === loading) {
    return null;
  }

  return currentView;
};
