import Server from 'webpack-dev-server';
import webpack from 'webpack';
import type {
  NextFunction,
  Request,
  Response,
  Stats,
} from 'webpack-dev-server';

function getBase64SourceMap(source: webpack.sources.Source) {
  const base64 = Buffer.from(JSON.stringify(source.map()), 'utf8').toString(
    'base64',
  );
  return `data:application/json;charset=utf-8;base64,${base64}`;
}

function getSourceById(stats: Stats, id: string) {
  const module = Array.from(stats.compilation.modules).find(
    (m) => stats.compilation.chunkGraph.getModuleId(m) === id,
  );
  return module ? module.originalSource() : null;
}

/*
 * Middleware responsible for retrieving a generated source
 * Receives a webpack internal url: "webpack-internal:///<module-id>"
 * Returns a generated source: "<source-text><sourceMappingURL><sourceURL>"
 *
 * Based on EvalSourceMapDevToolModuleTemplatePlugin.js
 */
export default function createEvalSourceMapMiddleware(server: Server) {
  return function handleWebpackInternalMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    if (req.url.startsWith('/__get-internal-source')) {
      const fileName = req.query.fileName as string;
      const match = fileName.match(/webpack-internal:\/\/\/(.+)/);
      const id = match ? match[1] : undefined;
      // Server.stats is private so we get around it this way
      const stats = server['stats'] as Stats | undefined;
      if (!id || !stats) {
        next();
      } else {
        const source = getSourceById(stats, id);
        if (source) {
          const base64SourceMap = getBase64SourceMap(source);
          const sourceMapURL = `//# sourceMappingURL=${base64SourceMap}`;

          const sourceURL = `//# sourceURL=webpack-internal:///${module.id}`;
          res.end(
            `${source.source() as string}\n${sourceMapURL}\n${sourceURL}`,
          );
        }
      }
    } else {
      next();
    }
  };
}
