if grep -q jpmchase ./yarn.lock; then
    # grep -q will return immediately if any match is found
    # Print first 10 instances of the failure for easier debugging
    grep -n -m 10 jpmchase ./yarn.lock
    echo "::error file=yarn.lock::No 'jpmchase.net' is allowed, use 'yarnpkg.com' instead. Check your npm config if needed."
    exit 1
fi