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
Jest 29 testing with JSDOM suggests TS version >=4.5