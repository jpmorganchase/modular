import { createContext } from 'react';
import type { RemoteViewErrorsContext, RemoteViewsContext } from './types';

export const ViewsContext = createContext<RemoteViewsContext>({});

export const ErrorContext = createContext<RemoteViewErrorsContext>({});
