---
'modular-scripts': patch
---

Fixed `modular add` from template not copying all template files when no "files"
field is specified in the package.json - now using npm-packlist for this
Added tests for adding from templates
Refactored addPackage tests to use a temp directory outside the repository and
improve performance by avoiding yarn commands in favour of mocking the behaviour
Added more descriptive log messages when running `modular add` with a local
template
