---
parent: Building your Apps
title: Adding web workers
---

It is possible to add
[web workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers)
to your application just by writing them as normal typescript modules. There are
some rules to follow to write a worker:

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
worker instance. For example:

```ts
// ./index.ts
import DateFormatterCls from './worker/dateFormatter.worker.ts';

// Instantiate the worker
const worker = new DateFormatterCls();

worker.current.onmessage = (message) =>
  console.log('Received a message from worker', message.data);
worker.postMessage(new Date.now());
```

```ts
// ./worker/dateFormatter.worker.ts
import { wait, format } from '../utils/date-utils';
// These imports are allowed because they refer to other modules

globalThis.self.onmessage = async (message: { data: number }) => {
  postMessage(`Hello there. Processing date...`);
  // Simulate work
  await wait(500);
  // Send back the formatter date
  postMessage(`Date is: ${format(message.data)}`);
};
```
