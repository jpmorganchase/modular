import * as React from 'react';
import { loading } from './symbol';

import type { MicrofrontendManifest } from '@modular-scripts/modular-types';

export type AppRegView = {
  name: string;
  root: string;
  manifest: string;
};

export interface View {
  default: React.ComponentType;
}

export type MicroFrontendState = Record<
  string,
  React.ComponentType | typeof loading
>;
export type ManifestCheck = (manifest: MicrofrontendManifest) => boolean;
