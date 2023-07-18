/**
 * Joins an ESM View URL or path to `package.json`
 *
 * baseUrl can be a relative (`/`-prefixed) path or absolute URL
 * baseUrl can also end with a trailing slash
 *
 * @param baseUrl e.g. https://cdn.example.com/foo/my-esm-view, /foo/my-esm-view
 * @returns
 */
export function getRemotePackageJsonUrl(baseUrl: string) {
  const optionalSlash = baseUrl.endsWith('/') ? '' : '/';
  return `${baseUrl}${optionalSlash}package.json`;
}

/**
 * Joins an ESM View URL or path with an asset path
 *
 * baseUrl can be a relative (`/`-prefixed) path or absolute URL
 * baseUrl can also end with a trailing slash
 * assetPath can be a relative (`/`-prefixed) path, absolute URL, or `./` prefixed path
 *
 * @param baseUrl e.g. https://cdn.example.com/foo/my-esm-view, /foo/my-esm-view
 * @param assetPath e.g. https://cdn.example.com/foo/module.js, ./foo/module.js, /foo/module.js
 *
 * @returns An absolute or relative oath to an asset, usually a .js or .css file
 */
export function getRemoteAssetUrl(baseUrl: string, assetPath: string) {
  // Absolute asset path
  if (assetPath.startsWith('http')) {
    return assetPath;
  }

  // Relative asset path - normalize to account for preceding `/` or `./`
  let normalizedAssetPath = assetPath;
  if (assetPath.startsWith('./')) {
    normalizedAssetPath = assetPath.slice(2, assetPath.length);
  }
  if (assetPath.startsWith('/')) {
    normalizedAssetPath = assetPath.slice(1, assetPath.length);
  }

  // Relative base URLs (cannot use the URL constructor)
  if (baseUrl.startsWith('/')) {
    const optionalSlash = baseUrl.endsWith('/') ? '' : '/';
    return `${baseUrl}${optionalSlash}${normalizedAssetPath}`;
  }

  // Absolute base URLs - use URL constructor and normalize trailing slashes
  const { pathname, origin } = new URL(baseUrl);
  const optionalSlash = pathname.endsWith('/') ? '' : '/';
  const start = `${origin}${pathname}${optionalSlash}`;
  return `${start}${normalizedAssetPath}`;
}

export function esmViewUrlIsValid(url: string) {
  if (url.length < 2) {
    return false;
  }

  let urlToParse = url;

  // Relative paths
  if (url.startsWith('/')) {
    urlToParse = `https://example.com${url}`;
  }

  try {
    // Attempt to parse using the URL constructor
    const parsed = new URL(urlToParse);
    // Require http protocols only
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }
    return true;
  } catch (e) {
    return false;
  }
}
