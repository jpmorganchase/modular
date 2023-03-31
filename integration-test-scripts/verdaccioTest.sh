#!/usr/bin/env bash


# All templates to test except app which is already installed
TEMPLATES=("app" "esm-view" "package" "view" "source")

mkdir /tmp/integration-tests/
cd /tmp/integration-tests/

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
fi

# Clean mess created by yarn set version
rm -r ./*

echo Testing with Yarn $(yarn -v)
yarn create modular-react-app test-repo --empty

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

