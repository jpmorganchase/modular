import type { Request, Response } from 'express';
import * as fs from 'fs-extra';
import * as path from 'path';
import { Paths } from '../../utils/createPaths';

type SourceMap = { sources: string[] };

export function createAbsoluteSourceMapMiddleware(
  paths: Paths,
  outDir: string,
) {
  return function sourceMapMiddleware(req: Request, res: Response): void {
    const filePath = path.join(outDir, req.path);
    void fs.readJson(filePath).then((sourceMapObject: SourceMap) => {
      sourceMapObject.sources = sourceMapObject.sources.map((sourcePath) =>
        path.join(outDir, sourcePath),
      );
      res.json(sourceMapObject);
    });
  };
}
