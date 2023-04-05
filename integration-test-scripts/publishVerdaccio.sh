#!/usr/bin/env bash

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
npm set //localhost:4873/:_authToken $TOKEN

PACKAGES=("modular-scripts" "create-modular-react-app" "eslint-config-modular-app" "modular-template-app" "modular-template-esm-view" "modular-template-package" "modular-template-source" "modular-template-view")
for package in "${PACKAGES[@]}";
do 
    echo $package
    cd ./packages/$package
    yarn publish --no-git-tag-version --no-commit-hooks --non-interactive --registry http://localhost:4873/ --new-version 99.0.0
    cd ../../
done
