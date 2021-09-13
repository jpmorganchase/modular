import esbuild from 'esbuild';
import * as ws from 'ws';
import { formatError } from '../utils/format-error';

export default function createPlugin(
  name: string,
  server: ws.Server,
): esbuild.Plugin {
  const plugin: esbuild.Plugin = {
    name: 'ws-reload',
    setup(build) {
      let building = false;
      let result: esbuild.BuildResult;

      const publish = () => {
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        server.clients.forEach(async (socket) => {
          socket.send(
            JSON.stringify({
              name,
              building,
              result: {
                errors: await Promise.all(result.errors.map(formatError)),
                warnings: await Promise.all(result.warnings.map(formatError)),
              },
            }),
          );
        });
      };

      server.on('connection', () => {
        publish();
      });

      build.onStart(() => {
        building = true;
        publish();
      });
      build.onEnd((_result) => {
        building = false;
        result = _result;

        publish();
      });
    },
  };
  return plugin;
}
