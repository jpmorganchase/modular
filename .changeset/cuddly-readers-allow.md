---
'modular-scripts': patch
---

Modular lint should not check for diffed files if regex is passed in. If there
are no files that meet the extension criteria (ts, tsx, js, jsx), then end the
lint.
