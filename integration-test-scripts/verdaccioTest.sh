#!/usr/bin/env bash


# All templates to test except app which is already installed
TEMPLATES=("app" "esm-view" "package" "view" "source")

mkdir /tmp/integration-tests/
mkdir /tmp/integration-tests/test-repo
cd /tmp/integration-tests/test-repo


# Set registry with yarn version specific command
if [[ $YARN_VERSION == 1.22.19 ]]
then
    # Not sure why we have to set it both ways but Yarn works in mysterious unpredictable ways 
    corepack prepare yarn@1.22.19 --activate
    yarn set version 1.22.19
    yarn config set registry http://localhost:4873/
else
    corepack prepare yarn@3.5.0 --activate
    yarn set version 3.5.0
    yarn config set unsafeHttpWhitelist localhost
    yarn config set npmRegistryServer http://localhost:4873/
    cd ../
    corepack prepare yarn@3.5.0 --activate
    yarn set version 3.5.0
    yarn config set unsafeHttpWhitelist localhost
    yarn config set npmRegistryServer http://localhost:4873/
    rm ./package.json
    cd /tmp/integration-tests/test-repo
fi


cd /tmp/integration-tests/
mkdir random
cd ./random

# Ensures yarn caches the latest 
yarn init -y
yarn add create-modular-react-app
echo CMRA Version used: $(yarn info create-modular-react-app version)

cd ../


echo Testing with Yarn $(yarn -v)

# Check verdaccio is still reachable
npm ping --registry http://localhost:4873/


if [[ $YARN_VERSION == 1.22.19 ]]
then
    NPM_REGISTRY_SERVER='http://localhost:4873/' yarn create modular-react-app test-repo  --empty
else
    REGISTRY='http://localhost:4873/' yarn create modular-react-app test-repo  --empty
fi
cd /tmp/integration-tests/test-repo/

for template in "${TEMPLATES[@]}"; 
do 
    echo testing $template
    yarn modular add $template --template $template
    yarn modular test $template
    yarn modular build $template
    USE_MODULAR_ESBUILD=true yarn modular build $template
    yarn modular analyze $template
done

yarn modular workspace
yarn modular lint $TEMPLATES
yarn modular typecheck

