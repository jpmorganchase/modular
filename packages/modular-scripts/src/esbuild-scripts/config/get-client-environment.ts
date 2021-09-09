// Grab NODE_ENV and REACT_APP_* environment variables and prepare them to be
// injected into the application via DefinePlugin in webpack configuration.
const REACT_APP = /^REACT_APP_/i;

export interface ClientEnvironment {
  raw: Record<string, string>;
  stringified: Record<string, string>;
}

export default function getClientEnvironment(
  publicUrl: string,
): ClientEnvironment {
  const raw = Object.keys(process.env)
    .filter((key) => REACT_APP.test(key))
    .reduce<Record<string, string>>(
      (env, key) => {
        env[key] = process.env[key] as string;
        return env;
      },
      {
        // Useful for determining whether we’re running in production mode.
        // Most importantly, it switches React into the correct mode.
        NODE_ENV: process.env.NODE_ENV || 'development',
        // Useful for resolving the correct path to static assets in `public`.
        // For example, <img src={process.env.PUBLIC_URL + '/img/logo.png'} />.
        // This should only be used as an escape hatch. Normally you would put
        // images into the `src` and `import` them in code to get their paths.
        PUBLIC_URL: publicUrl,
      },
    );

  // Stringify all values so we can feed into esbuild "define"
  // https://esbuild.github.io/api/#define
  const stringified = Object.entries(raw).reduce<Record<string, string>>(
    (env, [key, value]) => {
      env[`process.env.${key}`] = JSON.stringify(value);
      return env;
    },
    {},
  );

  // handle case where process.env.THING is accessed without it being injected into the environment
  stringified['process.env'] = JSON.stringify({});

  return { raw, stringified };
}
