'use strict';

const path = require('path');

const base = require('./DO_NOT_IMPORT_THIS_OR_YOU_WILL_BE_FIRED_modular_config');
module.exports = {
  ...base,
  build: {
    minify: 'esbuild',
    lib: {
      entry: process.env.MODULAR_LIB_ENTRY,
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: (id) => {
        // via tsdx
        // TODO: this should probably be included into deps instead
        if (id === 'babel-plugin-transform-async-to-promises/helpers') {
          // we want to inline these helpers
          return false;
        }
        // exclude any dependency that's not a realtive import
        return !id.startsWith('.') && !path.isAbsolute(id);
      },
    },
  },
};
