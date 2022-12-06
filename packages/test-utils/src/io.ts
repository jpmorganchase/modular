import { existsSync, mkdir, mkdtemp, writeFile, WriteFileOptions } from 'fs';

export const io = {
  mkdir(path: string): Promise<string> {
    return new Promise((done, fail) => {
      if (existsSync(path)) {
        return done(path);
      }

      mkdir(path, { recursive: true }, (err) => (err ? fail(err) : done(path)));
    });
  },
  mkdtemp(): Promise<string> {
    return new Promise((done, fail) => {
      mkdtemp((process.env.TMPDIR || '/tmp/') + '-test-', (err, path) => {
        err ? fail(err) : done(path);
      });
    });
  },
  writeFile(
    path: string,
    content: string,
    encoding: WriteFileOptions = 'utf-8',
  ): Promise<string> {
    return new Promise((done, fail) => {
      writeFile(path, content, encoding, (err) => {
        err ? fail(err) : done(path);
      });
    });
  },
};
