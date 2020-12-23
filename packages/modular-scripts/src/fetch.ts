import fetch, { RequestInit, Response } from 'node-fetch';
import { HttpProxyAgent } from 'http-proxy-agent';
import HttpsProxyAgent from 'https-proxy-agent';

const getAgent = () => {
  if (process.env.HTTP_PROXY || process.env.HTTPS_PROXY) {
    return proxyAgent;
  }
};
const proxyAgent = (parsedUrl: URL) => {
  const protocol = parsedUrl.protocol;
  if (protocol === 'https') {
    return new HttpsProxyAgent(process.env.HTTPS_PROXY as string);
  } else {
    return new HttpProxyAgent(process.env.HTTP_PROXY as string);
  }
};

async function modularFetch(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  return fetch(url, {
    ...init,
    agent: getAgent(),
  });
}

export default modularFetch;
