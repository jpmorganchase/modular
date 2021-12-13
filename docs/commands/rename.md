---
parent: Commands
title: modular rename
---

# `modular rename <oldPackageName> <newPackageName>`

Renames oldPackageName to newPackageName by:

1. Renaming the package directory to the new package directory
2. Re-writing the "name" field in the existing package.json to newPackageName
3. Parsing all the package.json dev, peer and regular dependencies and rewriting
   all the occurrences of oldPackageName to newPackageName
4. Parsing all the sources in all the depending packages and rewriting the
   imports to oldPackageName to import newPackageName

## Options:

`--verbose`: Shows debug information
