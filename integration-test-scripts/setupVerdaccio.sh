#!/usr/bin/env bash

# Install `verdaccio`, plus `forever`, which we use to run Verdaccio as a daemon i.e. in the background
yarn global add verdaccio@5.15.4
yarn global add forever

# Start Verdaccio, via `forever`
# This effectively daemonizes the running of verdaccio (i.e. makes it run in the background)
forever start -c "sh" verdaccio

# Add a new user to the Verdaccio registry.
# This is required to perform `npm publish`.
# We opt for a direct registry API call because `npm login` requires stdin, which is no good in the CI context.
# -> Returns a JSON body response containing an auth `token`
USER_RESP=$(curl -s \
  -H "Accept: application/json" \
  -H "Content-Type:application/json" \
  -X PUT --data '{"name": "verdaccio_user", "password": "verdaccio_pass"}' \
  http://localhost:4873/-/user/org.couchdb.user:verdaccio_user)

# Parse the raw registry response using Node.js
TOKEN=$(node -pe 'JSON.parse(process.argv[1]).token' "$USER_RESP")

# Install the token for the Verdaccio registry only
yarn config set //localhost:4873/:_authToken $TOKEN