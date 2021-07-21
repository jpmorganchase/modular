import { paramCase as toParamCase } from 'change-case';
import * as esbuild from 'esbuild';
import * as path from 'path';
import nodeResolve from 'resolve';
import getPackageName from '../utils/getPackageName';

import { getLogger } from './getLogger';
import getModularRoot from '../utils/getModularRoot';
import replaceExt from './replaceExt';

const outputDirectory = 'dist';

// It's important that .mjs is listed before .js so that we will interpret npm modules
// which deploy both ESM .mjs and CommonJS .js files as ESM.
const extensions = ['.ts', '.tsx', '.mjs', '.js', '.jsx'];

const fileRelative = (from: string, to: string) => {
  const relativeOutput = path.relative(path.dirname(from), to);
  if (relativeOutput.startsWith('.')) {
    return relativeOutput;
  } else {
    return `./${relativeOutput}`;
  }
};

async function runEsbuild({
  packagePath,
  entryPoint,
  write,
  format = 'esm',
}: {
  packagePath: string;
  entryPoint: string;
  write: boolean;
  format?: esbuild.Format;
}) {
  const outExtension = format === 'esm' ? '.mjs' : '.js';

  const dependencies: string[] = [];
  const queue: string[] = [];

  const packageName = await getPackageName(packagePath);

  const output = await esbuild.build({
    entryPoints: [entryPoint],
    write,
    bundle: true,
    sourcemap: true,
    outbase: path.join(getModularRoot(), packagePath, 'src'),
    outdir: path.join(
      getModularRoot(),
      'dist',
      toParamCase(packageName),
      `${outputDirectory}-${format}`,
    ),
    target: 'es2015',
    format,
    platform: 'node',
    outExtension: {
      '.js': outExtension,
    },
    plugins: [
      {
        name: 'pre-resolve',
        setup(build) {
          build.onResolve({ filter: /.*/ }, (args) => {
            return new Promise<undefined | esbuild.OnResolveResult>(
              (resolve, reject) => {
                if (args.kind !== 'entry-point') {
                  if (args.path.startsWith('.')) {
                    if (path.parse(args.path).ext) {
                      const resolvedFile = path.join(
                        args.resolveDir,
                        args.path,
                      );
                      queue.push(resolvedFile);
                      resolve({
                        path: resolvedFile,
                        external: true,
                      });
                    } else {
                      nodeResolve(
                        args.path,
                        {
                          basedir: args.resolveDir,
                          extensions,
                        },
                        (err, nodeResolvedFile) => {
                          if (err) {
                            reject(err);
                          } else {
                            if (nodeResolvedFile) {
                              queue.push(nodeResolvedFile);
                              let resolvedFile = nodeResolvedFile;
                              if (
                                ['.ts', '.tsx'].includes(
                                  path.extname(nodeResolvedFile),
                                )
                              ) {
                                resolvedFile = replaceExt(
                                  resolvedFile,
                                  outExtension,
                                );
                              }

                              resolve({
                                path: fileRelative(args.importer, resolvedFile),
                                external: true,
                              });
                            } else {
                              reject(`${args.path} could not be resolved.`);
                            }
                          }
                        },
                      );
                    }
                  } else {
                    dependencies.push(args.path);
                    resolve({
                      path: args.path,
                      external: true,
                    });
                  }
                } else {
                  resolve(undefined);
                }
              },
            );
          });
        },
      },
    ],
  });

  return {
    output,
    queue,
    dependencies,
  };
}

interface ESBuildOuptut {
  outputs: esbuild.BuildResult[];
  dependencies: string[];
  compiled: string[];
}

async function runQueuedEsbuild({
  packagePath,
  entryPoint,
  write,
  format = 'esm',
}: {
  packagePath: string;
  entryPoint: string;
  write: boolean;
  format?: esbuild.Format;
}): Promise<ESBuildOuptut> {
  const logger = getLogger(packagePath);

  const queue: string[] = [entryPoint];
  const outputs = [];
  const dependencies: Set<string> = new Set();
  const compiled: Set<string> = new Set();

  while (queue.length) {
    const entryPoint = queue.splice(0, 1)[0];
    if (compiled.has(entryPoint)) {
      // we've already compiled this file and there's no problem becuase we don't need to compile it again
    } else {
      compiled.add(entryPoint);

      const logPrefix = write ? `Compiling [${format}]` : `Analyzing`;
      logger.debug(`${logPrefix} ${entryPoint}`);

      const out = await runEsbuild({
        packagePath,
        entryPoint,
        format,
        write,
      });
      outputs.push(out.output);
      queue.push(...out.queue);
      out.dependencies.forEach((dep) => {
        dependencies.add(dep);
      });
    }
  }

  return {
    outputs,
    compiled: Array.from(compiled),
    dependencies: Array.from(dependencies),
  };
}

export default runQueuedEsbuild;
