import * as path from 'path';

import getModularRoot from './getModularRoot';
import getRelativeLocation from './getRelativeLocation';

export async function getLocation(name: string): Promise<string> {
  return path.join(getModularRoot(), await getRelativeLocation(name));
}

export default getLocation;
