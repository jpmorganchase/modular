import { createContext } from 'react';

import type { MicroFrontendState } from './types';

export const views = createContext<
  [
    MicroFrontendState,
    (value: (prevState: MicroFrontendState) => MicroFrontendState) => void,
  ]
>([{}, () => null]);
