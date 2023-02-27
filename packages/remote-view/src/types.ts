import * as React from 'react';
import { loading } from './utils/symbol';
import { RemoteViewError } from './utils/remoteViewError';

import type { MicrofrontendManifest } from '@modular-scripts/modular-types';

export type AppRegView = {
  name: string;
  root: string;
  manifest: string;
};

export interface View {
  default: React.ComponentType;
}

export type RemoteViewsContext = Record<
  string,
  React.ComponentType | typeof loading
>;

export type RemoteViewErrorsContext = Record<string, RemoteViewError | Error>;

export type ManifestCheck = (manifest: MicrofrontendManifest) => boolean;

export interface RemoteViewErrorInterface extends Error {
  remoteViewUrl: string;
}
