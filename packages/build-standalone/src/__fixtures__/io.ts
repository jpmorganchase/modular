import fs, { existsSync, symlinkSync, WriteFileOptions } from 'fs';

export function mkdir(path: string): Promise<string> {
  return new Promise((done, fail) => {
    if (existsSync(path)) {
      return done(path);
    }

    fs.mkdir(path, { recursive: true }, (err) =>
      err ? fail(err) : done(path),
    );
  });
}

export function mkdtemp(): Promise<string> {
  return new Promise((done, fail) => {
    fs.mkdtemp(
      (process.env.TMPDIR || '/tmp/') + 'modular-test-',
      (err, path) => {
        err ? fail(err) : done(path);
      },
    );
  });
}

export function writeFile(
  path: string,
  content: string | unknown,
  encoding: WriteFileOptions = 'utf-8',
): Promise<string> {
  return new Promise((done, fail) => {
    const data =
      typeof content === 'string' ? content : JSON.stringify(content, null, 2);
    fs.writeFile(path, data, encoding, (err) => {
      err ? fail(err) : done(path);
    });
  });
}

export function symLinkDir(source: string, target: string): void {
  symlinkSync(source, target, 'dir');
}
