/* eslint-disable jest/no-commented-out-tests */
// import tree from 'tree-view-for-tests';
// import path from 'path';
// import fs from 'fs-extra';
// import prettier from 'prettier';
// import {
//   createModularTestContext,
//   mockInstallTemplate,
//   runModularStreamlined,
// } from '../test/utils';
// import getModularRoot from '../utils/getModularRoot';

// // These tests must be executed sequentially with `--runInBand`.

// // Temporary test context paths set by createModularTestContext()
// let tempModularRepo: string;

// describe('when working with a NODE_ENV app', () => {
//   describe('WHEN building with webpack', () => {
//     beforeAll(async () => {
//       await setupNodeEnvApp();
//       await runModularStreamlined(tempModularRepo, 'build node-env-app');
//     });

//     it('can build a app', () => {
//       expect(tree(path.join(tempModularRepo, 'dist', 'node-env-app')))
//         .toMatchInlineSnapshot(`
//         "node-env-app
//         ├─ asset-manifest.json #1oz8cie
//         ├─ favicon.ico #6pu3rg
//         ├─ index.html #8yl21p
//         ├─ logo192.png #1nez7vk
//         ├─ logo512.png #1hwqvcc
//         ├─ manifest.json #19gah8o
//         ├─ package.json
//         ├─ robots.txt #1sjb8b3
//         └─ static
//            └─ js
//               ├─ main.5d879077.js #u1fxs5
//               ├─ main.5d879077.js.map #158jj7c
//               ├─ runtime-main.97707f9d.js #15lezt9
//               └─ runtime-main.97707f9d.js.map #1yg8f1m"
//       `);
//     });

//     it('can generate a manifest.json', async () => {
//       expect(
//         String(
//           await fs.readFile(
//             path.join(tempModularRepo, 'dist', 'node-env-app', 'manifest.json'),
//           ),
//         ),
//       ).toMatchSnapshot();
//     });
//     it('can generate a package.json', async () => {
//       expect(
//         String(
//           await fs.readFile(
//             path.join(tempModularRepo, 'dist', 'node-env-app', 'package.json'),
//           ),
//         ),
//       ).toMatchSnapshot();
//     });
//     it('can generate a main.js', async () => {
//       expect(
//         String(
//           await fs.readFile(
//             path.join(
//               tempModularRepo,
//               'dist',
//               'node-env-app',
//               'static',
//               'js',
//               'main.5d879077.js',
//             ),
//           ),
//         ),
//       ).toMatchSnapshot();
//     });
//     it('can generate a main.js.map', async () => {
//       expect(
//         String(
//           await fs.readFile(
//             path.join(
//               tempModularRepo,
//               'dist',
//               'node-env-app',
//               'static',
//               'js',
//               'main.5d879077.js.map',
//             ),
//           ),
//         ),
//       ).toMatchSnapshot();
//     });
//     it('can generate asset manifest', async () => {
//       expect(
//         String(
//           await fs.readFile(
//             path.join(
//               tempModularRepo,
//               'dist',
//               'node-env-app',
//               'asset-manifest.json',
//             ),
//           ),
//         ),
//       ).toMatchSnapshot();
//     });

//     // it('can generate a js/main.5d879077.js.map', async () => {
//     //   expect(
//     //     String(
//     //       await fs.readFile(
//     //         path.join(
//     //           tempModularRepo,
//     //           'dist',
//     //           'node-env-app',
//     //           'static',
//     //           'js',
//     //           'main.c42f5e48.js.map',
//     //         ),
//     //       ),
//     //     ),
//     //   ).toMatchSnapshot();
//     // });
//     // it('can generate a js/main.5d879077.js', async () => {
//     //   expect(
//     //     String(
//     //       await fs.readFile(
//     //         path.join(
//     //           tempModularRepo,
//     //           'dist',
//     //           'node-env-app',
//     //           'static',
//     //           'js',
//     //           'main.c42f5e48.js',
//     //         ),
//     //       ),
//     //     ),
//     //   ).toMatchSnapshot();
//     // });
//   });
//   describe('WHEN building with esbuild', () => {
//     beforeAll(async () => {
//       await setupNodeEnvApp();
//       await runModularStreamlined(tempModularRepo, 'build node-env-app', {
//         env: {
//           USE_MODULAR_ESBUILD: 'true',
//         },
//       });
//     });

//     it('can build a app', () => {
//       expect(tree(path.join(tempModularRepo, 'dist', 'node-env-app')))
//         .toMatchInlineSnapshot(`
//         "node-env-app
//         ├─ favicon.ico #6pu3rg
//         ├─ index.html #177xfr4
//         ├─ logo192.png #1nez7vk
//         ├─ logo512.png #1hwqvcc
//         ├─ manifest.json #19gah8o
//         ├─ package.json
//         ├─ robots.txt #1sjb8b3
//         └─ static
//            └─ js
//               ├─ index-L2US6VEL.js #7mn428
//               └─ index-L2US6VEL.js.map #sr6neg"
//       `);
//     });

//     it('can generate a js/index-L2US6VEL.js', async () => {
//       expect(
//         prettier.format(
//           String(
//             await fs.readFile(
//               path.join(
//                 tempModularRepo,
//                 'dist',
//                 'node-env-app',
//                 'static',
//                 'js',
//                 'index-L2US6VEL.js',
//               ),
//             ),
//           ),
//           {
//             filepath: 'index-L2US6VEL.js',
//           },
//         ),
//       ).toMatchSnapshot();
//     });
//   });
// });

// /**
//  * Create temp modular repo and add an app called node-env-app
//  */
// async function setupNodeEnvApp(): Promise<void> {
//   tempModularRepo = createModularTestContext();
//   mockInstallTemplate(
//     path.join(getModularRoot(), '__fixtures__/templates'),
//     tempModularRepo,
//   );
//   await runModularStreamlined(
//     tempModularRepo,
//     'add node-env-app --unstable-type modular-template-app',
//   );

//   await fs.writeFile(
//     path.join(tempModularRepo, 'packages', 'node-env-app', 'src', 'index.ts'),
//     `
//       console.log(process.env.NODE_ENV);
//       export {};
//       `,
//   );
// }

// HOW IT WAS BEFORE CHANGES
import execa from 'execa';
import rimraf from 'rimraf';
import tree from 'tree-view-for-tests';
import path from 'path';
import fs from 'fs-extra';
import prettier from 'prettier';
import getModularRoot from '../utils/getModularRoot';

const modularRoot = getModularRoot();

// These tests must be executed sequentially with `--runInBand`.

const packagesPath = path.join(getModularRoot(), 'packages');

function modular(str: string, opts: Record<string, unknown> = {}) {
  return execa('yarnpkg', ['modular', ...str.split(' ')], {
    cwd: modularRoot,
    cleanup: true,
    ...opts,
  });
}

function cleanup() {
  rimraf.sync(path.join(packagesPath, 'node-env-app'));
  rimraf.sync(path.join(modularRoot, 'dist/node-env-app'));

  // run yarn so yarn.lock gets reset
  return execa.sync('yarnpkg', ['--silent'], {
    cwd: modularRoot,
  });
}

beforeAll(cleanup);
afterAll(cleanup);

describe('when working with a NODE_ENV app', () => {
  beforeAll(async () => {
    await modular('add node-env-app --unstable-type app', { stdio: 'inherit' });

    await fs.writeFile(
      path.join(modularRoot, 'packages', 'node-env-app', 'src', 'index.ts'),
      `
      console.log(process.env.NODE_ENV);
      export {};
    `,
    );
  });

  describe('WHEN building with webpack', () => {
    beforeAll(async () => {
      rimraf.sync(path.join(modularRoot, 'dist/node-env-app'));

      await modular('build node-env-app', {
        stdio: 'inherit',
      });
    });

    it('can build a app', () => {
      expect(tree(path.join(modularRoot, 'dist', 'node-env-app')))
        .toMatchInlineSnapshot(`
        "node-env-app
        ├─ asset-manifest.json #5npfrr
        ├─ favicon.ico #6pu3rg
        ├─ index.html #9j6678
        ├─ logo192.png #1nez7vk
        ├─ logo512.png #1hwqvcc
        ├─ manifest.json #19gah8o
        ├─ package.json
        ├─ robots.txt #1sjb8b3
        └─ static
           └─ js
              ├─ main.a482480b.js #1xwb1v
              ├─ main.a482480b.js.map #4bcy8y
              ├─ runtime-main.97707f9d.js #15lezt9
              └─ runtime-main.97707f9d.js.map #1yg8f1m"
      `);
    });

    it('can generate a js/main.a482480b.js', async () => {
      expect(
        prettier.format(
          String(
            await fs.readFile(
              path.join(
                modularRoot,
                'dist',
                'node-env-app',
                'static',
                'js',
                'main.a482480b.js',
              ),
            ),
          ),
          {
            filepath: 'main.a482480b.js',
          },
        ),
      ).toMatchSnapshot();
    });
  });

  describe('WHEN building with esbuild', () => {
    beforeAll(async () => {
      rimraf.sync(path.join(modularRoot, 'dist/node-env-app'));

      await modular('build node-env-app', {
        stdio: 'inherit',
        env: {
          USE_MODULAR_ESBUILD: 'true',
        },
      });
    });

    it('can build a app', () => {
      expect(tree(path.join(modularRoot, 'dist', 'node-env-app')))
        .toMatchInlineSnapshot(`
        "node-env-app
        ├─ favicon.ico #6pu3rg
        ├─ index.html #1g8070q
        ├─ logo192.png #1nez7vk
        ├─ logo512.png #1hwqvcc
        ├─ manifest.json #19gah8o
        ├─ package.json
        ├─ robots.txt #1sjb8b3
        └─ static
           └─ js
              ├─ index-AOVVUWA4.js #6j61pf
              └─ index-AOVVUWA4.js.map #j51j3v"
      `);
    });

    it('can generate a js/index-AOVVUWA4.js', async () => {
      expect(
        prettier.format(
          String(
            await fs.readFile(
              path.join(
                modularRoot,
                'dist',
                'node-env-app',
                'static',
                'js',
                'index-AOVVUWA4.js',
              ),
            ),
          ),
          {
            filepath: 'index-AOVVUWA4.js',
          },
        ),
      ).toMatchSnapshot();
    });
  });
});
