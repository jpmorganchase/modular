import path from 'path';

export const packagesRoot = 'packages';
export const outputDirectory = 'dist';

export const cracoConfig = path.join(
  __dirname,
  '..',
  '..',
  'DO_NOT_IMPORT_THIS_OR_YOU_WILL_BE_FIRED_craco.config.js',
);
