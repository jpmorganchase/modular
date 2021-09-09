---
'modular-scripts': patch
---

Fix issue where subst file systems on windows would cause a mismatch in modular
root and process.cwd() results.
