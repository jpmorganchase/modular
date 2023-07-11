// Strip trailing slashes
function normalizeBaseUrl(baseUrl: string) {
  if (baseUrl.endsWith('/')) {
    return baseUrl.slice(0, baseUrl.length - 1);
  }

  return baseUrl;
}

// Safe path to package.json
export function getRemotePackageJsonUrl(baseUrl: string) {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  return `${normalizedBaseUrl}/package.json`;
}

// Safe path to `module` or `style` defined in a package.json
export function getRemoteAssetUrl(
  normalizedBaseUrl: string,
  assetPath: string,
) {
  // e.g. `https://localhost:3030/static/foo.js`
  if (assetPath.startsWith('http')) {
    return assetPath;
  }

  // e.g. `./static/foo.js`
  if (assetPath.startsWith('./')) {
    const normalizedAssetPath = assetPath.slice(2, assetPath.length);
    return `${normalizedBaseUrl}/${normalizedAssetPath}`;
  }

  // e.g. `/static/foo.js`
  if (assetPath.startsWith('/')) {
    const normalizedAssetPath = assetPath.slice(1, assetPath.length);
    return `${normalizedBaseUrl}/${normalizedAssetPath}`;
  }

  // e.g. foo.js
  return `${normalizedBaseUrl}/${assetPath}`;
}
