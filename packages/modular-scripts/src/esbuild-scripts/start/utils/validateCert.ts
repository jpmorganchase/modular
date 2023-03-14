import chalk from 'chalk';
import crypto from 'crypto';

// This code is mostly duplicated from webpack-dev-server, with some typings added.
// See: https://github.com/webpack/webpack-dev-server/blob/master/lib/Server.js

export function validateKeyAndCerts({
  cert,
  key,
  keyFile,
  crtFile,
}: {
  cert: unknown;
  key: unknown;
  keyFile: string;
  crtFile: string;
}) {
  let encrypted;
  try {
    // publicEncrypt will throw an error with an invalid cert
    encrypted = crypto.publicEncrypt(
      cert as crypto.PublicKeyInput,
      Buffer.from('test'),
    );
  } catch (err) {
    throw new Error(
      `The certificate "${chalk.yellow(crtFile)}" is invalid.\n${
        (err as Error).message
      }`,
    );
  }

  try {
    // privateDecrypt will throw an error with an invalid key
    crypto.privateDecrypt(key as crypto.RsaPrivateKey, encrypted);
  } catch (err) {
    throw new Error(
      `The certificate key "${chalk.yellow(keyFile)}" is invalid.\n${
        (err as Error).message
      }`,
    );
  }
}
