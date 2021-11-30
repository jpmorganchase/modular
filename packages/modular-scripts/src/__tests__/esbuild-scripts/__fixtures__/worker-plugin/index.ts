import WorkerCls from 'worker-loader:./alive.worker.ts';

const worker = new WorkerCls();

worker.addEventListener('message', (event: MessageEvent<string>) => {
  console.log(`Received message from worker: ${event.data}`);
});
