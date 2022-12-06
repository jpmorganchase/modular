import { Yarn1 } from './yarn1';
import type { PackageManagerIdentifier } from './detect';

export class Npm extends Yarn1 {
  public readonly type: PackageManagerIdentifier = 'npm';

  constructor() {
    super();
    throw new Error(`NPM support not yet implemented`);
  }
}
