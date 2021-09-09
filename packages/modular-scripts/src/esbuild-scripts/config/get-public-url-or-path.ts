import { URL } from 'url';

const stubDomain = 'https://create-esbuild-app.dev';

export default function getPublicUrlOrPath(
  isEnvDevelopment: boolean,
  homepage: string | undefined,
  envPublicUrl: string | undefined,
): string {
  if (envPublicUrl) {
    // ensure last slash exists
    const normalizedEnvPublicUrl = envPublicUrl.endsWith('/')
      ? envPublicUrl
      : envPublicUrl + '/';

    // validate if `envPublicUrl` is a URL or path like
    // `stubDomain` is ignored if `envPublicUrl` contains a domain
    const validPublicUrl = new URL(normalizedEnvPublicUrl, stubDomain);

    if (isEnvDevelopment) {
      if (normalizedEnvPublicUrl.startsWith('.')) {
        return '/';
      } else {
        return validPublicUrl.pathname;
      }
    } else {
      // Some apps do not use client-side routing with pushState.
      // For these, "homepage" can be set to "." to enable relative asset paths.
      return normalizedEnvPublicUrl;
    }
  }

  if (homepage) {
    // strip last slash if exists
    const normalizedHomepage = homepage.endsWith('/')
      ? homepage
      : homepage + '/';

    // validate if `homepage` is a URL or path like and use just pathname
    const validHomepagePathname = new URL(normalizedHomepage, stubDomain)
      .pathname;

    if (isEnvDevelopment) {
      return normalizedHomepage.startsWith('.') ? '/' : validHomepagePathname;
    } else {
      // Some apps do not use client-side routing with pushState.
      // For these, "homepage" can be set to "." to enable relative asset paths.
      if (normalizedHomepage.startsWith('.')) {
        return validHomepagePathname;
      } else {
        return normalizedHomepage;
      }
    }
  } else {
    return '/';
  }
}
