import { debug, log } from '../utils/logger';
import type { Paths } from '../utils/createPaths';
import createPaths from '../utils/createPaths';
import type { DependencyManifest } from './dependencyManifest';
import type { Asset } from './fileSizeReporter';
import type { ModularType } from '../utils/isModularType';
import getLocation from '../utils/getLocation';
import getModularRoot from '../utils/getModularRoot';
import { paramCase as toParamCase } from 'param-case';
import createEsbuildBrowserslistTarget from '../utils/createEsbuildBrowserslistTarget';
import { AsyncEventHandler } from '../utils/asyncEventEmitter';

export interface StandAloneBuilderContext {
  log(...args: unknown[]): void;

  debug(...args: unknown[]): void;

  assets: Asset[];
  jsEntryPoint?: string;
  cssEntryPoint?: string;

  browserTarget: string[];
  dependencies?: DependencyManifest;
  modularRoot: string;
  paths: Paths;
  previousFileSizes: Record<string, number>;
  targetDirectory: string;
  targetName: string;
  tool: BuildTool;
  type: ModularType;
}

export type StandAloneBuilderHandler =
  AsyncEventHandler<StandAloneBuilderContext>;

export type BuildTool = 'webpack' | 'esbuild';
export type StandAlonePackages = Extract<ModularType, 'app' | 'esm-view'>;

export async function createBuilderContext(
  target: string,
  tool: BuildTool,
  type: ModularType,
): Promise<StandAloneBuilderContext> {
  const targetDirectory = await getLocation(target);
  return {
    log(...args) {
      log(...(args as string[]));
    },
    debug(...args) {
      debug(...(args as string[]));
    },
    assets: [],
    paths: await createPaths(target),
    modularRoot: getModularRoot(),
    targetDirectory,
    targetName: toParamCase(target),
    tool,
    type,
    browserTarget: createEsbuildBrowserslistTarget(targetDirectory),
    previousFileSizes: {},
  };
}

export function filterTool(
  tool: BuildTool,
  handler: StandAloneBuilderHandler,
): StandAloneBuilderHandler {
  return (context) => context.tool === tool && handler(context);
}

export function filterType(
  type: ModularType,
  handler: StandAloneBuilderHandler,
): StandAloneBuilderHandler {
  return (context) => context.type === type && handler(context);
}
