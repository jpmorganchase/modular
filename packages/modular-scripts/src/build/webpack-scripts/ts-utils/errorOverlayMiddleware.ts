import launchEditor from '../js-utils/launchEditor';
import launchEditorEndpoint from '../js-utils/launchEditorEndpoint';

export default function createLaunchEditorMiddleware() {
  return function launchEditorMiddleware(req: any, res: any, next: any) {
    if (req.url.startsWith(launchEditorEndpoint)) {
      const lineNumber = parseInt(req.query.lineNumber, 10) || 1;
      const colNumber = parseInt(req.query.colNumber, 10) || 1;
      launchEditor(req.query.fileName, lineNumber, colNumber);
      res.end();
    } else {
      next();
    }
  };
}
