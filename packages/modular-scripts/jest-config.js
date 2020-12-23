// We run jest by ourselves instead of using CRA's test runner because it assumes
// that we're running from the context of an app, wherewas we're running the context
// of a monorepo. Owning the runner then gives us the opportunity to generate
// coverage reports correctly across workspaces, etc.

const { createJestConfig } = require('@craco/craco');
const cracoConfig = require('./DO_NOT_IMPORT_THIS_OR_YOU_WILL_BE_FIRED_craco.config.js');
const jestConfig = createJestConfig(cracoConfig);
module.exports = jestConfig;
