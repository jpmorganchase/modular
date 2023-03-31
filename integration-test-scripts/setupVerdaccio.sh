#!/usr/bin/env bash

# Install `verdaccio`, plus `forever`, which we use to run Verdaccio as a daemon i.e. in the background
yarn global add verdaccio@5.15.4
yarn global add forever

# Start Verdaccio, via `forever`
# This effectively daemonizes the running of verdaccio (i.e. makes it run in the background)
forever start -c "sh" ./integration-test-scripts/startVerdaccio.sh

npm ping --registry http://localhost:4873/
