// We run jest by ourselves instead of using CRA's test runner because it assumes
// that we're running from the context of an app, wherewas we're running the context
// of a monorepo. Owning the runner then gives us the opportunity to generate
// coverage reports correctly across workspaces, etc.

// https://github.com/facebook/create-react-app/blob/master/packages/react-scripts/scripts/test.js

require('react-scripts/config/env');

const verifyPackageTree = require('react-scripts/scripts/utils/verifyPackageTree');
if (process.env.SKIP_PREFLIGHT_CHECK !== 'true') {
  verifyPackageTree();
}

// Unlike CRA, let's NOT verify typescript config when running tests.
