import { createContext } from 'react';

import type { RemoteViewsContext, RemoteViewErrorsContext } from './types';

export const ViewsContext = createContext<RemoteViewsContext>({});

export const ErrorContext = createContext<RemoteViewErrorsContext>({});
