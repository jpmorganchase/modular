export function envBool(input: string | undefined, def = true): boolean {
  return (def && !input) || input === 'true';
}
