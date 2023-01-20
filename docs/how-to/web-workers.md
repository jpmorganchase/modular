---
parent: How To
nav_order: 4
title: Adding web workers
---

# Adding web workers

It is possible to add
[web workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers)
to your [application](../package-types/app.md) just by writing them as normal
typescript modules. This is the example worker that we will be using in this
guide:

```ts
import { wait, format } from '../utils/date-utils';
globalThis.self.onmessage = async (message: { data: number }) => {
  postMessage(`Hello there. Processing date...`);
  // Simulate work
  await wait(500);
  // Send back the formatter date
  postMessage(`Date is: ${format(message.data)}`);
};
```

## Workers using Webpack

Webpack supports workers
[out-of-the-box](https://webpack.js.org/guides/web-workers/). You can name the
worker however you want and import it with
[the Worker constructor](https://developer.mozilla.org/en-US/docs/Web/API/Worker/Worker).
Webpack will automatically split the worker as a separate chunk. Please note
that you might need to set `"compilerOptions": { "module": "es2020" }` or
something equivalent in your `tsconfig.json` for `import.meta.url` to be
correctly typechecked.

```ts
const worker = new Worker(new URL('./dateFormatter', import.meta.url));

worker.onmessage = (message) =>
  console.log('Received a message from worker', message.data);
const now = Date.now();
worker.postMessage(now);
```

## Workers using Esbuild

There are some additional rules to follow to write a worker using
[esbuild mode](../configuration.md/#useModularEsbuild):

- Your worker module must follow the `<filename>.worker.[ts|js|jsx|tsx]` name
  pattern for Modular to build it as a worker.
- Worker extension must be explicitly included in the import statement for the
  typechecker to correctly type it. `import Worker from './my.worker.ts'` is ok,
  `import Worker from './my.worker'` is not.
- A worker can only `import` other modules. Trying to `import` files that have a
  different extension than `[ts|js|jsx|tsx]` will trigger a build error.
- If a worker doesn't `import` any other module, it should `export {}` or
  `export default {}` to avoid being marked as global module by the type
  checker.

Importing a worker will return a `Class` that, when instantiated, returns a
worker instance. This is the same example as before adapted to work in esbuild
mode:

```ts
import Worker from './worker/dateFormatter.worker.ts';

// Instantiate the worker
const worker = new Worker();

worker.current.onmessage = (message) =>
  console.log('Received a message from worker', message.data);
const now = Date.now();
worker.postMessage(now);
```
