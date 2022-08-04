/* eslint-disable strict */
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const NUM_PACKAGES = 1000;

if (!fs.existsSync(`${process.cwd()}${path.sep}generate-modular-packages.js`)) {
  console.error('This script should only be called from the root of modular');
  process.exit(1);
}

const packagesDir = `${process.cwd()}${path.sep}packages`;

// console.log(`Clearing the packages dir... (${packagesDir})`);
// fs.rmSync(packagesDir, { recursive: true, force: true });
// fs.mkdirSync(packagesDir);

for (let i = 0; i < NUM_PACKAGES; i += 1) {
  const id = uuidv4();
  const pkgName = `pkg-${id}`;
  const pkgJson = `
  {
    "name": "${pkgName}",
    "private": true,
    "modular": {
      "type": "app"
    },
    "version": "1.0.0"
  }
`;
  const pkgDir = `${packagesDir}${path.sep}${pkgName}`;
  fs.mkdirSync(pkgDir);
  fs.writeFileSync(`${pkgDir}${path.sep}package.json`, pkgJson, 'utf-8');
}

console.log(
  `Done! ${NUM_PACKAGES} dummy packages were generated in /packages.`,
);
