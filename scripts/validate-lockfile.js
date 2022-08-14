'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const lockfilePath = path.join(__dirname, '..', 'yarn.lock');

let failed = false;
let file = fs.readFileSync(lockfilePath, 'utf8');

for (const [key, { linkType, version, resolution }] of Object.entries(
  yaml.load(file),
)) {
  if (key === '__metadata' || linkType === 'soft') {
    continue;
  }

  if (!/.@npm:/.test(decodeURIComponent(resolution))) {
    console.error(linkType, resolution, version);
    failed = true;
  }
}

if (failed) {
  console.log('FAILED');
  process.exit(1);
} else {
  process.exit(0);
}
