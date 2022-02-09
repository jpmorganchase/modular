---
title: Philosophy
nav_order: 1
parent: Concepts
---

`modular` believes the burden to learn a "Framework" with proprietary APIs in a
rapidly evolving landscape is an inhibitor to **scaled web engineering**.

There is already a very strong set of **Language Constructs, Frameworks and
Tooling** that the front end community is rallying around like `TypeScript`,
`ES6 Modules`, `React`, `Parcel`, `Webpack`, `GitHub Actions`, `Jest`,
`Workspaces` etc.

Scaled Engineering requires a few more Frameworks, Libraries and Tools that are
not yet first class citizens in the world of Front End Engineering like
**Universal Data Fetching**, **Feature Flags**, **Analytics Capture**,
**Security**, **Deployment** etc.

`modular` attempts to bring the best Language Constructs, Libraries, Frameworks
and Tooling together to establish a set of patterns and definitions to enable
**Monorepo** based engineering.

## Convention over configuration

The goal of `modular` is to decrease the number of decisions the programmer has
to make and eliminate the complexity of having to configure all and each of the
areas of application development. The immediate result is that you can create
many more things in less time.

`modular` is designed to make you focus on the things that are critical to
delivering features in your application by making a set of **pragmatic**
configuration choices - this includes things like testing configuration, file
location and repository structure.

The problem with many of the tools in the front end landscape is they encourage
every team, repository, and person to make a configuration choice. This works
great for open source software because tools can appeal to a broad range of
developers, but for businesses this means that teams often need dedicated people
to manage this configuration and apply decisions to teams.

This is the reasont that modular doesn't expose any internal configuration to
end-users, apart from repository agnostic choices, or options required for
_integration_.
