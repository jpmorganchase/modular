export default function multiply(...operands: number[]): number {
  return operands.reduce((a, o) => a * o);
}
