---
title: Versioning Packages
parent: Concepts
---

# Version Control in a Modular Repository

Modular's primary focus is on the build & testing of your packages and
applications. It's not concerned with how you run CI or version the artefacts
built by it.

There's a multitude of packages and tools out there which you can use to version
the packages within your repository. Modular internally uses
[`changesets`](https://github.com/atlassian/changesets), a tool written by
Atlassian which applies changeset files to generate the new versions of
packages.
