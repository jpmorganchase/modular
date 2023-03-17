import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import chalk from 'chalk';
import type { Paths } from './determineTargetPaths';

// Ensure the certificate and key provided are valid and if not
// throw an easy to debug error
function validateKeyAndCerts({
  cert,
  key,
  keyPath,
  certPath,
}: {
  cert: Buffer;
  key: Buffer;
  keyPath: string;
  certPath: string;
}) {
  let encrypted;
  try {
    // publicEncrypt will throw an error with an invalid cert
    encrypted = crypto.publicEncrypt(cert, Buffer.from('test'));
  } catch (err) {
    if (err instanceof Error) {
      throw new Error(
        `The certificate "${chalk.yellow(certPath)}" is invalid.\n${
          err.message
        }`,
      );
    }
  }
  if (encrypted) {
    try {
      // privateDecrypt will throw an error with an invalid key
      crypto.privateDecrypt(key, encrypted);
    } catch (err) {
      if (err instanceof Error) {
        throw new Error(
          `The certificate key "${chalk.yellow(keyPath)}" is invalid.\n${
            err.message
          }`,
        );
      }
    }
  }
}

// Read file and throw an error if it doesn't exist
function readEnvFile(file: string, type: string) {
  if (!fs.existsSync(file)) {
    throw new Error(
      `You specified ${chalk.cyan(
        type,
      )} in your env, but the file "${chalk.yellow(file)}" can't be found.`,
    );
  }
  return fs.readFileSync(file);
}

// Get the https config
// Return cert files if provided in env, otherwise just true or false
export default function getHttpsConfig(paths: Paths, modularRoot: string) {
  const { SSL_CRT_FILE, SSL_KEY_FILE, HTTPS } = process.env;
  const isHttps = HTTPS === 'true';

  let cert: Buffer | undefined;
  let key: Buffer | undefined;
  let keyPath: string | undefined;
  let certPath: string | undefined;

  if (isHttps && SSL_CRT_FILE && SSL_KEY_FILE) {
    // 1. Look in the app directory (non-root) - legacy behaviour
    certPath = path.resolve(paths.appPath, SSL_CRT_FILE);
    keyPath = path.resolve(paths.appPath, SSL_KEY_FILE);

    try {
      cert = readEnvFile(certPath, 'SSL_CRT_FILE');
      key = readEnvFile(keyPath, 'SSL_KEY_FILE');
    } catch (e) {
      // 2. Fall back to the modular root
      certPath = path.resolve(modularRoot, SSL_CRT_FILE);
      keyPath = path.resolve(modularRoot, SSL_KEY_FILE);

      cert = readEnvFile(certPath, 'SSL_CRT_FILE');
      key = readEnvFile(keyPath, 'SSL_KEY_FILE');
    }

    const config = {
      cert,
      key,
    };

    validateKeyAndCerts({ ...config, keyPath, certPath });
    return config;
  }
  return isHttps;
}
