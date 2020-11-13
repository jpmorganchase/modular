#!/usr/bin/env node

import createModularApp from './cli';
import mri from 'mri';

const argv = mri(process.argv.slice(2));

try {
  void createModularApp(argv);
} catch (err) {
  console.error(err);
}
