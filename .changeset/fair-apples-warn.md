---
"modular-scripts": patch
---

Fix esbuild start hanging when ctrl-c is pressed to terminate it, due to oustanding ws connection with the browser.
