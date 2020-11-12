## modular-site (wip)

This package serves a few purposes:

- We can use it as a sample application for testing `modular` workflow and
  commands, and it'll be a bellweather for when something possibly changes or
  breaks.

- `modular` currently has a quirk where a modular repository needs at least one
  'app' for tests to run. Since this repository is self-hosted, it suffers the
  same quirk. This package enables tests to run cleanly.

- We can use this as a the documentation site! Or any other experiments, really.
  It lacks server side rendering story (by design), but that should be fine for
  now.
