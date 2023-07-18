import type { RemoteViewErrorInterface } from '../types';

export class RemoteViewError extends Error implements RemoteViewErrorInterface {
  remoteViewUrl: string;

  constructor(message: string, remoteViewUrl: string) {
    super(message);
    Object.setPrototypeOf(this, RemoteViewError.prototype);

    this.name = 'RemoteViewError';
    this.remoteViewUrl = remoteViewUrl;
  }
}
