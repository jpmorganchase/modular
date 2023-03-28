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
