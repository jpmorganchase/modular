import { ITestContext } from './create-test-context';

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function workspace(context: ITestContext) {
  const queue: Array<Promise<unknown>> = [];

  return {
    yarn() {
      queue.push(context.file('yarn.lock'));
      return this;
    },
    npm() {
      queue.push(context.file('package-lock.json'));
      return this;
    },

    get then() {
      const promise = Promise.all(queue);
      return promise.then.bind(promise);
    },
  };
}
