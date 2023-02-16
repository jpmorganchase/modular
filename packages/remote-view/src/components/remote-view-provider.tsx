import React, { useState } from 'react';
import { views } from '../context';

import type { PropsWithChildren } from 'react';
import type { MicroFrontendState } from '../types';

export const RemoteViewProvider = ({
  children,
}: PropsWithChildren<unknown>): JSX.Element => {
  const value = useState<MicroFrontendState>({});

  return <views.Provider value={value}>{children}</views.Provider>;
};
