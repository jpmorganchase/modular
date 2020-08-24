#!/usr/bin/env bash

function print_help {
  echo "Usage: ${0} [OPTIONS]"
  echo ""
  echo "OPTIONS:"
  echo "  --interactive             gain a bash shell after the test run"
  echo "  --help                    print this message and exit"
  echo ""
}

interactive=false

while [ "$1" != "" ]; do
  case $1 in
    "--interactive")
      interactive=true
      ;;
    "--help")
      print_help
      exit 0
      ;;
  esac
  shift
done

docker run \
  --env CI=true \
  --tty \
  --rm \
  --user node \
  --volume ${PWD}:/var/modular \
  --workdir /var/modular \
  $([[ ${interactive} == 'true' ]] && echo '--interactive') \
  ianwalter/puppeteer:v4.0.0 \
  bash -c "git config --global user.email 'test@example.com' && git config --global user.name 'Test' && yarn e2e --detectOpenHandles --forceExit"
