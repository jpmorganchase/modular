import os from 'os';

/**
 * Validates comparison options in combination.
 *
 * Throws and exits when invalid combinations are detected.
 */
export function validateCompareOptions(
  compareBranch: string | undefined,
  changed: boolean,
): void {
  if (compareBranch && !changed) {
    process.stderr.write(
      "Option --compareBranch doesn't make sense without option --changed\n",
    );
    process.exit(1);
  }
}

/**
 * Validates and converts concurrency option to number.
 *
 * Throws and exits when invalid value is detected.
 */
export function computeConcurrencyOption(
  concurrencyLevel: string | undefined,
): number {
  if (!concurrencyLevel) {
    // If concurrencyLevel is not supplied, default to the number of CPUs. If the number of CPUs is 0 (/proc or equivalent is unavailable), default to no concurrency.
    return os.cpus().length || 1;
  }

  // Otherwise, try to parse it
  const concurrency = parseInt(concurrencyLevel, 10);

  // If not a number or a negative number, bail out with an error.
  if (isNaN(concurrency) || concurrency < 0) {
    process.stderr.write(
      `--currencyLevel must be a number greater or equal than 0. You specified "${concurrencyLevel}" instead.`,
    );
    process.exit(1);
  }

  return concurrency;
}
