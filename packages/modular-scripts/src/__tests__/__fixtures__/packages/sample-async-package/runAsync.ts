export function runAsync(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log('done');
      resolve();
    }, 1000);
  });
}
