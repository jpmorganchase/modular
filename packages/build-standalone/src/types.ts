import type { Paths } from 'modular-scripts/src/utils/createPaths';
import type { Asset } from 'modular-scripts/src/build/fileSizeReporter';

import type { ModularType } from '@modular-scripts/modular-types';

export interface ModularBuildConfig {
  type: ModularType;
  modularRoot: string;
  targetDirectory: string;
  targetName: string;
  targetPaths: Paths;
}

export interface ModularBuildContext {
  type: ModularType;
  assets: Asset[];
}
