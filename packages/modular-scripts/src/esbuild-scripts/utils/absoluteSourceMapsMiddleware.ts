import type { Request, Response } from 'express';
import * as fs from 'fs-extra';
import * as path from 'path';

type SourceMap = { sources: string[] };

/* This middleware remedies this issue - https://github.com/evanw/esbuild/pull/1234,
   where paths in sources that are relative to outDir break react-error-overlay.
   This is to be used before static.
*/

export function createAbsoluteSourceMapMiddleware(outDir: string) {
  return function sourceMapMiddleware(req: Request, res: Response): void {
    const filePath = path.join(outDir, req.path);
    void fs.readJson(filePath).then((sourceMapObject: SourceMap) => {
      // Make all paths absolute
      sourceMapObject.sources = sourceMapObject.sources.map((sourcePath) =>
        path.join(outDir, sourcePath),
      );
      res.json(sourceMapObject);
    });
  };
}
