import { AsyncEvent, asyncEvent, AsyncEventHandler } from './asyncEventEmitter';

export interface TaskLifecycle<Context> {
  initialize: AsyncEvent<Context>;
  beforeGenerate: AsyncEvent<Context>;
  generate: AsyncEvent<Context>;
  afterGenerate: AsyncEvent<Context>;
  finalize: AsyncEvent<Context>;

  run(context: Context): Promise<void>;
}

class Lifecycle<Context> implements TaskLifecycle<Context> {
  public readonly initialize = asyncEvent<Context>();
  public readonly beforeGenerate = asyncEvent<Context>();
  public readonly generate = asyncEvent<Context>();
  public readonly afterGenerate = asyncEvent<Context>();
  public readonly finalize = asyncEvent<Context>();

  public async run(context: Context) {
    await [
      this.initialize,
      this.beforeGenerate,
      this.generate,
      this.afterGenerate,
      this.finalize,
    ].reduce(
      async (chain, emitter) => await emitter.emit(context),
      Promise.resolve(),
    );
  }
}

export function createLifecycle<Context>(): TaskLifecycle<Context> {
  return new Lifecycle<Context>();
}

export function requireInContext<Context>(
  key: keyof Context,
  handler: AsyncEventHandler<Context>,
): AsyncEventHandler<Context> {
  return (context) => {
    if (!context[key]) {
      throw new Error(
        `requireInContext: cannot run without first setting "${String(key)}"`,
      );
    }

    return handler(context);
  };
}
