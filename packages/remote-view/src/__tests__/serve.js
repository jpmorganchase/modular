'use strict';

const path = require('path');
const http = require('http');
const serveStatic = require('serve-static');
const finalhandler = require('finalhandler');

// Serve the 2 ESM views (the build output of both)
const esmViewsPath = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  '__fixtures__',
  'remote-view-fake-cdn',
);

const serve = serveStatic(esmViewsPath);

// Create server
const server = http.createServer(function onRequest(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  serve(req, res, finalhandler(req, res));
});

// Listen
const port = 8484;
console.log(`Static server (remote-view) launched on port ${port}`);
server.listen(port);
