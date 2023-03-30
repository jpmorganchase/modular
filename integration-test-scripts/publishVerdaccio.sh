#!/usr/bin/env bash

PACKAGES=("modular-scripts" "create-modular-react-app" "eslint-config-modular-app" "modular-template-app" "modular-template-esm-view" "modular-template-package" "modular-template-source" "modular-template-view")
for package in "${PACKAGES[@]}";
do 
    echo $package
    cd ./packages/$package
    yarn publish --no-git-tag-version --no-commit-hooks --non-interactive --registry http://localhost:4873/ --new-version 999.0.0
    cd ../../
done