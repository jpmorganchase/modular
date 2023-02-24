// Ported over functions from webpackDevServerUtils.ts
import address from 'address';
import chalk from 'chalk';
import url from 'url';
import path from 'path';
import { existsSync } from 'fs';
import { log } from './logger';
import { ProxyConfigArray, Request, Response } from 'webpack-dev-server';
import type * as http from 'http';
import type * as httpProxy from 'http-proxy';

export function prepareProxy(
  proxy: unknown,
  appPublicFolder: string,
  servedPathname: string,
): ProxyConfigArray | undefined {
  // `proxy` lets you specify alternate servers for specific requests.
  if (!proxy) {
    return undefined;
  }
  if (typeof proxy !== 'string') {
    log(chalk.red('When specified, "proxy" in package.json must be a string.'));
    log(chalk.red('Instead, the type of "proxy" was "' + typeof proxy + '".'));
    log(
      chalk.red(
        'Either remove "proxy" from package.json, or make it a string.',
      ),
    );
    process.exit(1);
  }

  // If proxy is specified, let it handle any request except for
  // files in the public folder and requests to the WebpackDevServer socket endpoint.
  // https://github.com/facebook/create-react-app/issues/6720
  const sockPath = process.env.WDS_SOCKET_PATH || '/ws';
  const isDefaultSockHost = !process.env.WDS_SOCKET_HOST;
  function mayProxy(pathname: string) {
    const maybePublicPath = path.resolve(
      appPublicFolder,
      pathname.replace(new RegExp('^' + servedPathname), ''),
    );
    const isPublicFileRequest = existsSync(maybePublicPath);
    // used by webpackHotDevClient
    const isWdsEndpointRequest =
      isDefaultSockHost && pathname.startsWith(sockPath);
    return !(isPublicFileRequest || isWdsEndpointRequest);
  }

  if (!/^http(s)?:\/\//.test(proxy)) {
    console.log(
      chalk.red(
        'When "proxy" is specified in package.json it must start with either http:// or https://',
      ),
    );
    process.exit(1);
  }

  const target = process.platform === 'win32' ? resolveLoopback(proxy) : proxy;

  return [
    {
      target,
      logLevel: 'silent',
      // For single page apps, we generally want to fallback to /index.html.
      // However we also want to respect `proxy` for API calls.
      // So if `proxy` is specified as a string, we need to decide which fallback to use.
      // We use a heuristic: We want to proxy all the requests that are not meant
      // for static assets and as all the requests for static assets will be using
      // `GET` method, we can proxy all non-`GET` requests.
      // For `GET` requests, if request `accept`s text/html, we pick /index.html.
      // Modern browsers include text/html into `accept` header when navigating.
      // However API calls like `fetch()` won’t generally accept text/html.
      // If this heuristic doesn’t work well for you, use `src/setupProxy.js`.
      context: function (pathname: string, req: Request): boolean {
        const shouldFilter =
          req.method !== 'GET' ||
          (mayProxy(pathname) &&
            req.headers.accept &&
            req.headers.accept.indexOf('text/html') === -1)
            ? true
            : false;
        return shouldFilter;
      },
      onProxyReq: function (
        proxyReq: http.ClientRequest,
        _req: Request,
        _res: Response,
        _options: httpProxy.ServerOptions,
      ) {
        // Browsers may send Origin headers even with same-origin
        // requests. To prevent CORS issues, we have to change
        // the Origin to match the target URL.
        if (proxyReq.getHeader('origin')) {
          proxyReq.setHeader('origin', target);
        }
      },
      onError: onProxyError(target),
      secure: false,
      changeOrigin: true,
      ws: true,
      xfwd: true,
    },
  ];
}

function resolveLoopback(proxy: string) {
  const o = url.parse(proxy);
  if (o.hostname !== 'localhost') {
    return proxy;
  }
  // Unfortunately, many languages (unlike node) do not yet support IPv6.
  // This means even though localhost resolves to ::1, the application
  // must fall back to IPv4 (on 127.0.0.1).
  // We can re-enable this in a few years.
  /*try {
      o.hostname = address.ipv6() ? '::1' : '127.0.0.1';
    } catch (_ignored) {
      o.hostname = '127.0.0.1';
    }*/

  try {
    // Check if we're on a network; if we are, chances are we can resolve
    // localhost. Otherwise, we can just be safe and assume localhost is
    // IPv4 for maximum compatibility.
    if (!address.ip()) {
      o.hostname = '127.0.0.1';
    }
  } catch (_ignored) {
    o.hostname = '127.0.0.1';
  }
  return url.format(o);
}

// We need to provide a custom onError function for httpProxyMiddleware.
// It allows us to log custom error messages on the console.
function onProxyError(proxy: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (err: any, req: Request, res: Response) => {
    const host = req.headers && req.headers.host;
    console.log(
      chalk.red('Proxy error:') +
        ' Could not proxy request ' +
        chalk.cyan(req.url) +
        ' from ' +
        chalk.cyan(host) +
        ' to ' +
        chalk.cyan(proxy) +
        '.',
    );
    console.log(
      'See https://nodejs.org/api/errors.html#errors_common_system_errors for more information (' +
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        chalk.cyan(err.code) +
        ').',
    );
    console.log();

    // And immediately send the proper error response to the client.
    // Otherwise, the request will eventually timeout with ERR_EMPTY_RESPONSE on the client side.
    if (res.writeHead && !res.headersSent) {
      res.writeHead(500);
    }
    res.end(
      // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
      'Proxy error: Could not proxy request ' +
        req.url +
        ' from ' +
        host +
        ' to ' +
        proxy +
        ' (' +
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        err.code +
        ').',
    );
  };
}
