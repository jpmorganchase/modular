import WorkerCls from './alive.worker';

const worker = new WorkerCls();

worker.addEventListener('message', (event) => {
    console.log(`Received message from worker: ${event.data}`)
});