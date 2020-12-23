import fetch, { RequestInit } from 'node-fetch';
import HttpsProxyAgent = require("https-proxy-agent")

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
    return new HttpsProxyAgent(process.env.HTTP_PROXY as string);
  }
};

async function modularFetch(url: string, init?: RequestInit) {
  return fetch(url, {
    ...init,
    agent: getAgent(),
  });
}

export default modularFetch;
