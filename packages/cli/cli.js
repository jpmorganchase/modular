#!/usr/bin/env node

const meow = require('meow');
const shell = require('shelljs');
const fs = require('fs');
const path = require('path');
const generate = require('./generateComponentImports');

shell.config.fatal = true;
shell.config.verbose = true;

const cracoBin = path.join(__dirname, './node_modules/.bin/craco');
const cracoConfig = path.join(__dirname, 'craco.config.js');

function run() {
  const cli = meow({
    description: 'Dashboards for a new generation',
    help: `
  Usage:
    $ modular app <name>
    $ modular new <name>
    $ modular start
    $ modular build
    $ modular test
    $ modular map
`,
  });
  const command = cli.input[0];
  switch (command) {
    case 'app':
      app(cli.input[1]);
      break;
    case 'new':
      widget(cli.input[1]);
      break;
    case 'test': {
      // eslint-disable-next-line no-unused-vars
      const [_cmd, ...args] = cli.input;
      test(args.join(' '));
      break;
    }
    case 'start':
      start();
      break;
    case 'build':
      build();
      break;
    case 'map':
      map();
      break;
    default:
      console.log(cli.help);
      process.exit(1);
  }
}

function removeKeys(obj, keys) {
  keys.forEach((key) => {
    delete obj[key];
  });
  return obj;
}

function toPascalCase(str) {
  return str
    .replace(new RegExp(/[-_]+/, 'g'), ' ')
    .replace(new RegExp(/[^\w\s]/, 'g'), '')
    .replace(
      new RegExp(/\s+(.)(\w+)/, 'g'),
      ($1, $2, $3) => `${$2.toUpperCase() + $3.toLowerCase()}`,
    )
    .replace(new RegExp(/\s/, 'g'), '')
    .replace(new RegExp(/\w/), (s) => s.toUpperCase());
}
// https://stackoverflow.com/questions/4068573/convert-string-to-pascal-case-aka-uppercamelcase-in-javascript
// because I was lazy

function app(name) {
  // create a new CRA app, modify config for workspaces
  // TODO - don't run inside another modular folder
  shell.mkdir(name);
  process.chdir(name);
  shell.exec(`yarn init -y`);
  fs.writeFileSync(
    './package.json',
    JSON.stringify(
      Object.assign(JSON.parse(fs.readFileSync('./package.json', 'utf8')), {
        private: true,
        workspaces: ['app', 'widgets/*'],
        modular: {
          app: 'app',
          widgets: 'widgets',
        },
        scripts: {
          start: 'modular start',
          build: 'modular build',
          test: 'modular test',
          map: 'modular map',
          lint: 'eslint .',
          prettier: 'prettier --write .',
        },
        eslintConfig: {
          extends: 'modular',
        },
        prettier: {
          singleQuote: true,
          trailingComma: 'all',
          printWidth: 80,
          proseWrap: 'always',
        },
      }),
      null,
      '  ',
    ),
  );
  shell.exec('yarn add prettier --dev -W');
  shell.exec(
    `yarn add ~/code/work/modular/packages/eslint-config-modular --dev -W`,
  ); // TODO - this should point to an actual package ha
  shell.mkdir('widgets');
  shell.cp(path.join(__dirname, 'WidgetsReadme.md'), 'widgets/README.md');
  shell.exec(`yarn create react-app app`);
  // TODO - this should use a ---template, which includes store.js
  // and doesn't include a service worker?
  process.chdir('app');
  shell.cp(path.join(__dirname, 'store.js'), 'src/store.js');
  shell.mv('./.gitignore', './..');
  shell.rm('yarn.lock');
  fs.writeFileSync(
    './package.json',
    JSON.stringify(
      removeKeys(JSON.parse(fs.readFileSync('./package.json', 'utf8')), [
        'scripts',
        'eslintConfig',
      ]),
      null,
      '  ',
    ),
  );
  process.chdir('..');
  map();
  shell.exec('yarn prettier');
  shell.exec('git init'); // TODO - make an initial commit?
}

function widget(name) {
  // create a new widget source folder
  if (fs.existsSync(`widgets/${name}`)) {
    throw new Error('already exists!');
  }
  verifyRoot();
  shell.mkdir('-p', `widgets/${name}`);
  shell.exec(
    `cp -r ${path.join(__dirname, './component-starter')}/. widgets/${name}/`,
  ); // this doesn't use shell.cp because it doesn't correctly spread the folder's contents

  process.chdir(`widgets/${name}`);

  fs.readdirSync('./', { withFileTypes: true }).forEach((entry) => {
    if (entry.isDirectory()) {
      return;
    }

    fs.writeFileSync(
      entry.name,
      fs
        .readFileSync(entry.name, 'utf8')
        .replace(/Component\$\$/g, toPascalCase(name)),
    );
  });

  shell.exec('yarn add react react-dom');
  process.chdir('../..');
  map();
  shell.exec('yarn prettier');
}

function test(args) {
  verifyRoot();
  map();
  process.chdir('app');
  shell.exec(`${cracoBin} test --config ${cracoConfig} ${args}`);
  // TODO - should be able to run this in any folder
}

function start() {
  // serve the app
  verifyRoot();
  map();
  process.chdir('app');
  shell.exec(`${cracoBin} start --config ${cracoConfig}`);
}

function build() {
  verifyRoot();
  map();
  process.chdir('app');
  shell.exec(`${cracoBin} build --config ${cracoConfig}`);
}

function map() {
  verifyRoot();
  process.chdir('app');
  fs.writeFileSync('./src/widgets.js', generate('../widgets'));
  process.chdir('..');
}

function verifyRoot() {
  try {
    const modularConfig = JSON.parse(fs.readFileSync('./package.json', 'utf8'))
      .modular;
    if (
      typeof modularConfig.app === 'string' &&
      modularConfig.widgets === 'string'
    ) {
      return;
    }
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();

// TODOS
// - fail if yarn isn't on the machine
// - only allow yarn
// - remove craco, meow, shelljs dependencies
// - can components change their name? how to prevent
//   that from happening? or if it does happen, how does one update
//   their db/wherever they store this?
// - make sure react/react-dom have the same versions across the repo
// fix stdio coloring
// the components map has to be 'virtual'
// verify IDE integration
// how do you write tests for this???
// sparse checkout helpers
// auto assign reviewers???
// SOON
// - show an actual example working, with an app registry and everything
// - try to use module federation? will need to fork react-scripts and/or webpack

// unanswered questions
//   - global store/data flow?
//   - drilldown pattern
//   - filters
//   etc etc

// desktop / RN / custom renderers
// er, angular?
