import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import selfsigned from 'selfsigned';
import rimraf from 'rimraf';
import * as logger from '../../../utils/logger';

const del = promisify(rimraf);

// This code is mostly duplicated from webpack-dev-server, with some typings added.
// To provide consistent https behaviour in esbuild mode, we use the same directories to store the generated cert.
// See: https://github.com/webpack/webpack-dev-server/blob/master/lib/Server.js

function findCacheDir() {
  const cwd = process.cwd();

  let dir: string | undefined = cwd;

  for (;;) {
    try {
      if (fs.statSync(path.join(dir, 'package.json')).isFile()) break;
    } catch (e) {}

    const parent = path.dirname(dir);

    if (dir === parent) {
      dir = undefined;
      break;
    }

    dir = parent;
  }

  if (!dir) {
    return path.resolve(cwd, '.cache/webpack-dev-server');
  } else if (process.versions.pnp === '1') {
    return path.resolve(dir, '.pnp/.cache/webpack-dev-server');
  } else if (process.versions.pnp === '3') {
    return path.resolve(dir, '.yarn/.cache/webpack-dev-server');
  }

  return path.resolve(dir, 'node_modules/.cache/webpack-dev-server');
}

export async function generateSelfSignedCert() {
  const certificateDir = findCacheDir();
  const certificatePath = path.join(certificateDir, 'server.pem');
  let certificateExists = fs.existsSync(certificatePath);

  if (certificateExists) {
    const certificateTtl = 1000 * 60 * 60 * 24;
    const certificateStat = fs.statSync(certificatePath);

    const now = new Date();

    // cert is more than 30 days old, kill it with fire
    if ((Number(now) - Number(certificateStat.ctime)) / certificateTtl > 30) {
      logger.log('SSL Certificate is more than 30 days old. Removing...');

      await del(certificatePath);

      certificateExists = false;
    }
  }

  if (!certificateExists) {
    logger.log('Generating SSL Certificate...');

    const attributes = [{ name: 'commonName', value: 'localhost' }];
    const pems = selfsigned.generate(attributes, {
      algorithm: 'sha256',
      days: 30,
      keySize: 2048,
      extensions: [
        {
          name: 'basicConstraints',
          cA: true,
        },
        {
          name: 'keyUsage',
          keyCertSign: true,
          digitalSignature: true,
          nonRepudiation: true,
          keyEncipherment: true,
          dataEncipherment: true,
        },
        {
          name: 'extKeyUsage',
          serverAuth: true,
          clientAuth: true,
          codeSigning: true,
          timeStamping: true,
        },
        {
          name: 'subjectAltName',
          altNames: [
            {
              // type 2 is DNS
              type: 2,
              value: 'localhost',
            },
            {
              type: 2,
              value: 'localhost.localdomain',
            },
            {
              type: 2,
              value: 'lvh.me',
            },
            {
              type: 2,
              value: '*.lvh.me',
            },
            {
              type: 2,
              value: '[::1]',
            },
            {
              // type 7 is IP
              type: 7,
              ip: '127.0.0.1',
            },
            {
              type: 7,
              ip: 'fe80::1',
            },
          ],
        },
      ],
    });

    fs.mkdirSync(certificateDir, { recursive: true });
    fs.writeFileSync(certificatePath, pems.private + pems.cert, {
      encoding: 'utf8',
    });
  }

  const fakeCert = fs.readFileSync(certificatePath);

  logger.log(`SSL certificate: ${certificatePath}`);

  return fakeCert;
}
