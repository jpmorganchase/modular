#!/usr/bin/env bash


YARN_VERSION=$(yarn -v | cut -d "." -f1)
# All templates to test except app which is already installed
TEMPLATES=("app" "esm-view" "package" "view" "source")

cd /tmp

#Remove - just debug
echo $YARN_VERSION
echo $(yarn-v)

# Set registry with yarn version specific command
if [ $YARN_VERSION -eq '1' ]
then
    yarn config set registry http://localhost:4873/
else
    # Not sure why we have to set it again but it won't use it otherwise 
    yarn set version 3.5.0
    yarn config set unsafeHttpWhitelist localhost
    yarn config set npmRegistryServer http://localhost:4873/
fi

yarn create modular-react-app test-repo --empty

cd /tmp/test-repo

for template in $TEMPLATES; do 
    echo templates
    yarn modular add $template --template $template
    yarn modular test $template
    yarn modular build $template
    USE_MODULAR_ESBUILD=true yarn modular build $template
    yarn modular analyze $template
done

yarn modular workspace
yarn modular lint $TEMPLATES
yarn modular typecheck

