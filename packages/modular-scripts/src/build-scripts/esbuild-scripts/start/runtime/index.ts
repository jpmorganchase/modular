import {
  reportBuildError,
  setEditorHandler,
  startReportingRuntimeErrors,
} from 'react-error-overlay';
import stripAnsi from 'strip-ansi';

let isFirstCompilation = true;
let hasCompileErrors = false;

setEditorHandler(function editorHandler(errorLocation) {
  // Keep this sync with errorOverlayMiddleware.js
  void fetch(
    '/__open-stack-frame-in-editor' +
      '?fileName=' +
      window.encodeURIComponent(errorLocation.fileName) +
      '&lineNumber=' +
      window.encodeURIComponent(errorLocation.lineNumber || 1) +
      '&colNumber=' +
      window.encodeURIComponent(errorLocation.colNumber || 1),
  );
});

function clearOutdatedErrors() {
  // Clean up outdated compile errors, if any.
  if (typeof console !== 'undefined' && typeof console.clear === 'function') {
    if (hasCompileErrors) {
      console.clear();
    }
  }
}

startReportingRuntimeErrors({
  filename: '/index.js',
});

const url = new URL('/_ws', window.location.href);
url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
const connection = new WebSocket(url.toString());

// Unlike WebpackDevServer client, we won't try to reconnect
// to avoid spamming the console. Disconnect usually happens
// when developer stops the server.
connection.onclose = function () {
  if (typeof console !== 'undefined' && typeof console.info === 'function') {
    console.info(
      'The development server has disconnected.\nRefresh the page if necessary.',
    );
  }
};

interface WebSocketMessage {
  name: string;
  result: {
    warnings: string[];
    errors: string[];
  };
  building: boolean;
}

connection.onmessage = (m: MessageEvent) => {
  if (typeof m.data !== 'string') {
    // This shouldn't ever happen
    throw new Error(
      "Data from WebSocket Message Event not a string, can't parse",
    );
  }
  const message = JSON.parse(m.data) as WebSocketMessage;
  const { building, result } = message;

  if (building) {
    clearOutdatedErrors();
  } else {
    hasCompileErrors = !!(result?.errors.length || result?.warnings.length);

    if (!hasCompileErrors && !isFirstCompilation) {
      window.location.reload();
    } else {
      clearOutdatedErrors();

      const formatted = result;

      if (
        typeof console !== 'undefined' &&
        typeof console.warn === 'function'
      ) {
        for (let i = 0; i < formatted.warnings.length; i++) {
          if (i === 5) {
            console.warn(
              'There were more warnings in other files.\n' +
                'You can find a complete log in the terminal.',
            );
            break;
          }
          console.warn(stripAnsi(formatted.warnings[i]));
        }
      }

      if (
        typeof console !== 'undefined' &&
        typeof console.error === 'function'
      ) {
        for (let i = 0; i < formatted.errors.length; i++) {
          console.error(stripAnsi(formatted.errors[i]));
        }
      }

      reportBuildError(formatted.errors[0]);
    }
  }
  // set whether this is the first build of this bundle
  if (isFirstCompilation) {
    isFirstCompilation = false;
  }
};
