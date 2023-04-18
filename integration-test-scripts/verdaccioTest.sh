#!/usr/bin/env bash


# All templates to test except app which is already installed
TEMPLATES=("app" "esm-view" "package" "view" "source")

mkdir /tmp/integration-tests/
mkdir /tmp/integration-tests/test-repo
cd /tmp/integration-tests/test-repo


# Set registry with yarn version specific command
if [[ $YARN_VERSION == 1.22.19 ]]
then
    # Not sure why we have to set it both with corepack and yarn set, but Yarn works in mysterious unpredictable ways 
    corepack prepare yarn@1.22.19 --activate
    yarn set version 1.22.19
    yarn config set registry http://localhost:4873/
else
    # Setting it in both the parent directory, and the repo directory that will be used by CMRA
    corepack prepare yarn@3.5.0 --activate
    yarn set version 3.5.0
    yarn config set unsafeHttpWhitelist localhost
    yarn config set npmRegistryServer http://localhost:4873/
    rm ./package.json
    cd /tmp/integration-tests/
    corepack prepare yarn@3.5.0 --activate
    yarn set version 3.5.0
    yarn config set unsafeHttpWhitelist localhost
    yarn config set npmRegistryServer http://localhost:4873/
    rm ./package.json
    
    # Create command not officially supported by Yarn 3, so we get the actual package and run the script manually 
    mkdir utility
    cd ./utility 
    yarn init -y
    echo 'nodeLinker: node-modules' > .yarnrc.yml
    yarn add create-modular-react-app
fi

cd /tmp/integration-tests/

echo Testing with Yarn $(yarn -v)

if [[ $YARN_VERSION == 1.22.19 ]]
then
    yarn create modular-react-app test-repo  --empty
else
    # With Yarn > 1 we don't use the yarn create command, instead we run CMRA from .bin
    ./utility/node_modules/.bin/create-modular-react-app test-repo  --empty
fi

cd /tmp/integration-tests/test-repo/

# Ensure full logs with Yarn 3 & that it won't error fail when the test repo's lockfile is changed
yarn config set  preferAggregateCacheInfo false
yarn config set enableImmutableInstalls false

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
yarn modular lint -all
yarn modular typecheck

