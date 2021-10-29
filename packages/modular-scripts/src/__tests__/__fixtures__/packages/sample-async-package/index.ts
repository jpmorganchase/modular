export default async function runInAsync(): Promise<void> {
  const { runAsync } = await import('./runAsync');

  return runAsync();
}
