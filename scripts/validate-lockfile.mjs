import lockfile from '@yarnpkg/lockfile';
import fs from 'fs';
import path from 'path';
import { URL } from 'url';

const __dirname = new URL('.', import.meta.url).pathname;

const lockfilePath = path.join(__dirname, '..', 'yarn.lock');

let file = fs.readFileSync(lockfilePath, 'utf8');
let json = lockfile.parse(file);

let failed = false;
for (const entry of Object.entries(json.object)) {
  const [dependency, resolution] = entry;
  const { resolved, version } = resolution;
  if (/jpmchase\.net/.test(resolved)) {
    failed = true;
    console.error(`${dependency}@${version}: ${resolved}`);
  }
}

if (failed) {
  console.log('FAILED');
  process.exit(1);
} else {
  process.exit(0);
}
