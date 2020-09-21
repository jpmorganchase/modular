---
'create-modular-react-app': patch
'modular-scripts': patch
---

Do not print `execa` stack traces when processes error.

Ensure that the `build/` directory does not get added into a Git repository.

Let the underlying commands handle any `--help` argument instead of `modular`'s
own argument parser.
