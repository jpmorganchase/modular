---
title: Versioning Packages
parent: Concepts
nav_order: 400
---

# Version Control in a Modular Repository

Modular's primary objective is to provide frictionless
[build](../commands/build.md) and [test](../commands/test.md) functionality for
your micro-frontend monorepo.

How you version the built artifacts and run your CI pipelines is up to you, but
we recommend [`changesets`](https://github.com/atlassian/changesets), a tool
written by Atlassian which uses changeset files to generate new versions of
packages.
