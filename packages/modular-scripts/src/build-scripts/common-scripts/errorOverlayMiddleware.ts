import launchEditor from './launchEditor';
import * as express from 'express';

export default function createLaunchEditorMiddleware() {
  return function launchEditorMiddleware(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) {
    if (
      req.url.startsWith('/__open-stack-frame-in-editor') &&
      typeof req.query.lineNumber === 'string' &&
      typeof req.query.colNumber === 'string' &&
      typeof req.query.fileName === 'string'
    ) {
      const lineNumber = parseInt(req.query.lineNumber, 10) || 1;
      const colNumber = parseInt(req.query.colNumber, 10) || 1;
      launchEditor(req.query.fileName, lineNumber, colNumber);
      res.end();
    } else {
      next();
    }
  };
}
