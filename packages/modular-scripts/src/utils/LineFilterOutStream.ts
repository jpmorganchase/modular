import { Transform } from 'stream';

export default class LineFilterOutStream extends Transform {
  // A stream transform to filter out lines that pass the regexp test
  buffer = '';
  pattern: RegExp;

  constructor(pattern: RegExp) {
    super();
    this.pattern = pattern;
  }

  _transform(
    chunk: unknown,
    encoding: BufferEncoding,
    callback: (error?: Error | null, data?: string) => void,
  ): void {
    const data = String(chunk);
    const lines = data.split('\n');

    // Handle last line which is probably incomplete
    lines[0] = this.buffer + lines[0];
    this.buffer = lines.pop() ?? '';

    const output = lines.reduce((acc, line) => {
      if (!this.pattern.test(line)) {
        acc += `${line}\n`;
      }
      return acc;
    }, '');

    this.push(output);
    callback();
  }
}
