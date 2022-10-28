import type { ModularBuildConfig } from '../types';

export function mockBuildConfig(
  input: Partial<ModularBuildConfig>,
): ModularBuildConfig {
  return input as ModularBuildConfig;
}
