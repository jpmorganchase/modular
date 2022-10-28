import type { ModularType } from '@modular-scripts/modular-types';
import type { ModularBuildConfig } from '../types';
import type { WorkflowPlugin } from '../workflow';

export function checkType<T>(
  config: ModularBuildConfig,
  ...allowTypes: ModularType[]
): WorkflowPlugin<T> {
  return {
    phase: 'validate',
    handler(context: T) {
      if (allowTypes.includes(config.type)) {
        return context;
      }

      throw new Error(`checkType(${config.type}) not a permitted type`);
    },
  };
}
