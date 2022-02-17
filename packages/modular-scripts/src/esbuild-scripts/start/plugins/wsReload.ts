import esbuild from 'esbuild';
import * as ws from 'ws';
import type Websocket from 'ws';
import { formatError } from '../../utils/formatError';
import type { Paths } from '../../../utils/createPaths';

export default function createPlugin(
  name: string,
  server: ws.Server,
  paths: Paths,
): esbuild.Plugin {
  const plugin: esbuild.Plugin = {
    name: 'ws-reload',
    setup(build) {
      let building = false;
      let result: esbuild.BuildResult;

      const publishClient = async (socket: Websocket) => {
        socket.send(
          JSON.stringify({
            name,
            building,
            result: {
              errors: await Promise.all(
                result.errors.map((error) =>
                  formatError(error, paths.modularRoot),
                ),
              ),
              warnings: await Promise.all(
                result.warnings.map((warning) =>
                  formatError(warning, paths.modularRoot),
                ),
              ),
            },
          }),
        );
      };

      const publishAll = () =>
        Promise.all(Array.from(server.clients).map(publishClient));

      server.on('connection', (s) => void publishClient(s));

      build.onStart(() => {
        building = true;
        void publishAll();
      });
      build.onEnd((_result) => {
        building = false;
        result = _result;
        void publishAll();
      });
    },
  };
  return plugin;
}
