'use strict';

const path = require('path');
const http = require('http');
const serveStatic = require('serve-static');
const finalhandler = require('finalhandler');

// Serve up public/ftp folder
const outputPath = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  '__fixtures__',
  'remote-view',
  'output',
);
const serve = serveStatic(outputPath);

// Create server
const server = http.createServer(function onRequest(req, res) {
  serve(req, res, finalhandler(req, res));
});

// Listen
const port = 8484;
console.log(`Static server (remote-view) launched on port ${port}`);
server.listen(port);
