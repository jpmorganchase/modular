import { createContext } from 'react';
import { RemoteViewError } from './utils/remoteViewError';

import type { MicroFrontendState } from './types';

export const ViewsContext = createContext<
  [
    MicroFrontendState,
    (value: (prevState: MicroFrontendState) => MicroFrontendState) => void,
  ]
>([{}, () => null]);

export const ErrorContext = createContext<
  [
    RemoteViewError | undefined,
    (
      value: (prevState: RemoteViewError | undefined) => RemoteViewError,
    ) => void,
  ]
>([undefined, () => null]);
