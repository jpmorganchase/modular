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
console.log(outputPath);
const serve = serveStatic(outputPath);

// Create server
const server = http.createServer(function onRequest(req, res) {
  serve(req, res, finalhandler(req, res));
});

// Listen
server.listen(8484);
