---
'create-modular-react-app': major
'eslint-config-modular-app': major
'modular-scripts': major
'modular-template-app': patch
'modular-template-esm-view': patch
'modular-template-view': patch
---

Added Node 18 engine support
Upgraded Jest from 26 to 29 as 26 wasn't compatible with Node 18
Upgraded to rollup-plugin-esbuild 5, dropping support for Node 14.17 and below
Supported Node versions now: ^14.18.0 || >=16.10.0 || >=18.0.0
Changed Jest flag --watchAll default to false (was previously true if running locally and not in CI)