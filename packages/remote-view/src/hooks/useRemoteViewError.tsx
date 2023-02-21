import { useContext } from 'react';
import { ErrorContext } from '../context';
import { RemoteViewError } from '../utils/remoteViewError';

export const useRemoteViewError = (): RemoteViewError | undefined => {
  const [error] = useContext(ErrorContext);

  return error;
};
