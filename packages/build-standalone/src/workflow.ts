export type WorkflowStage = 'validate' | 'cleanup';

export type WorkflowHandler<T> = (context: T) => Promise<T> | T;

export class Workflow<T> {
  #events = new Map<WorkflowStage, Array<WorkflowHandler<T>>>();

  #handlers(phase: WorkflowStage): WorkflowHandler<T>[] {
    return this.#events.get(phase) || [];
  }

  register<P extends WorkflowStage>(
    phase: P,
    handler: WorkflowHandler<T>,
  ): this {
    this.#events.set(phase, [...this.#handlers(phase), handler]);
    return this;
  }

  async execute(context: T): Promise<T> {
    return await series(context, [
      (c) => series(c, this.#handlers('validate')),
      (c) => series(c, this.#handlers('cleanup')),
    ]);
  }
}

export type WorkflowPlugin<T> = {
  phase: WorkflowStage;
  handler: WorkflowHandler<T>;
};

export function createWorkflow<T>(
  ...plugins: Array<WorkflowPlugin<T> | WorkflowPlugin<T>[] | void>
): Workflow<T> {
  const workflow = new Workflow<T>();
  plugins.flat().forEach((plugin) => {
    plugin && workflow.register(plugin.phase, plugin.handler);
  });

  return workflow;
}

async function series<T>(context: T, steps: Array<WorkflowHandler<T>>) {
  for (const step of steps) {
    context = await step(context);
  }

  return context;
}
