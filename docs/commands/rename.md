---
parent: Commands
title: modular rename
---

# `modular rename <oldPackageName> <newPackageName>`

Renames oldPackageName to newPackageName by:

1. Re-writing the "name" field in the existing package.json to newPackageName
1. Parsing all the sources in all the depending packages and rewriting the
   imports to oldPackageName to import newPackageName

This action is `atomic`: if an error occurs while converting, it will stash any
changes made and bring the repo back to the previous state prior to the attempt.

Please note that the directory containing oldPackageName is _not_ renamed,
because the link between directory name and package name is not unambiguous: for
example, nested or scoped packages created with modular get a nested path that
is not easily unambiguosly invertible. The user will need to rename the
directory if needed.

## Options:

`--verbose`: Shows debug information
