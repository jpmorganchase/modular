---
title: Versioning Packages
parent: Concepts
---

# Version Control in a Modular Repository

Modular's primary focus is on the build & testing of your packages and
applications, it's not concerned with how you run CI or version the artefacts
built by it.

There's a multitude of packages and tools out there which you can use to version
the packages within your repository - some of the biggest of these are

- [`changesets`](https://github.com/atlassian/changesets) - a tool written by
  Atlassian which applies changeset files to generate the new versions of
  packages. This is what modular uses internally for managing package versions
  when publishing.

- [`lerna`](https://github.com/lerna/lerna/) - another open source tool designed
  for monorepository management. Lerna is more abstract than changesets when it
  comes to determining version increments but is still easy to use.
