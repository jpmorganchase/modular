import * as esbuild from 'esbuild';
import * as path from 'path';
import * as tmp from 'tmp';
import svgrPlugin from '../../esbuild-scripts/plugins/svgr';
import incrementalCompilePlugin from '../../esbuild-scripts/plugins/incrementalCompile';
import getModularRoot from '../../utils/getModularRoot';
import { Paths } from '../../utils/createPaths';
import prepareUrls from '../../esbuild-scripts/config/urls';

class MockLogger {
  private buffer: string[] = [];
  private started = false;
  start() {
    this.started = true;
  }
  getOutput() {
    return Array.from(this.buffer);
  }
  log(...x: string[]) {
    if (this.started) {
      this.buffer.push(...x);
    }
  }
  clear() {
    this.buffer.push('</CLEAR>');
  }
}

const logger = new MockLogger();
jest.mock('../../utils/logger', () => {
  return {
    __esModule: true,
    get debug() {
      return logger.log.bind(logger);
    },
    get log() {
      return logger.log.bind(logger);
    },
    get clear() {
      return logger.clear.bind(logger);
    },
  };
});

describe('When running a build with incremental compile', () => {
  let tmpDir: tmp.DirResult;
  let outdir: string;
  let compilePromise: Promise<void>;
  let compilePlugin: esbuild.Plugin;
  let complete = false;

  beforeAll(() => {
    tmpDir = tmp.dirSync();
    outdir = path.join(tmpDir.name, 'output');

    const paths = {
      appPackageJson: path.join(getModularRoot(), 'package.json'),
    } as unknown as Paths;
    const urls = prepareUrls('https', 'localhost', 8080);
    const incrementalCompile = incrementalCompilePlugin(paths, urls);
    compilePlugin = incrementalCompile.plugin;
    compilePromise = incrementalCompile.initialBuildPromise;
    void compilePromise.then(() => {
      complete = true;
    });

    logger.start();
  });

  it('SHOULD have a promise which is unresolved', () => {
    expect(complete).toEqual(false);
  });

  describe('WHEN the build is run', () => {
    beforeAll(async () => {
      await esbuild.build({
        entryPoints: [
          path.join(__dirname, '__fixtures__', 'svgr-component', 'index.tsx'),
        ],
        plugins: [svgrPlugin(), compilePlugin],
        // so that we don't get huge output sizes...
        external: ['react', 'react-dom'],
        outdir,
        bundle: true,
        splitting: true,
        format: 'esm',
        target: 'es2021',
      });
    });

    it('SHOULD make the incremental compile promise as done', () => {
      expect(complete).toEqual(true);
    });

    it('SHOULD have logger buffer output', () => {
      expect(logger.getOutput()).toMatchSnapshot();
    });
  });
});
