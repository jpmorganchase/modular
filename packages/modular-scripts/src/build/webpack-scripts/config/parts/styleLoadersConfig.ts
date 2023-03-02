import postcssNormalize from 'postcss-normalize';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import { Paths } from '../../../common-scripts/determineTargetPaths';
import { RuleSetUseItem } from 'webpack';

// common function to get style loaders
export default function createConfig({
  cssOptions,
  preProcessor,
  includeEsmLoader,
  dependencyMap,
  isEnvProduction,
  shouldUseSourceMap,
  paths,
}: {
  cssOptions: { importLoaders: number; sourceMap: boolean; modules?: any };
  preProcessor?: any;
  includeEsmLoader?: boolean;
  dependencyMap: Map<string, string>;
  isEnvProduction: boolean;
  shouldUseSourceMap: boolean;
  paths: Paths;
}): RuleSetUseItem[] {
  const isEnvDevelopment = !isEnvProduction;
  const loaders = [
    // This loader translates external css dependencies if we're using a CDN
    // Since it's a pitching loader, it's important that it stays at the top
    // excluding all the others in the chain if it's triggered
    includeEsmLoader &&
      function externalStyleLoader(info: any) {
        return {
          loader: require.resolve('../cdnStyleLoader'),
          options: { info, dependencyMap },
        };
      },
    isEnvDevelopment && require.resolve('style-loader'),
    isEnvProduction && {
      loader: MiniCssExtractPlugin.loader,
      // css is located in `static/css`, use '../../' to locate index.html folder
      // in production `paths.publicUrlOrPath` can be a relative path
      options: paths.publicUrlOrPath
        ? paths.publicUrlOrPath.startsWith('.')
          ? { publicPath: '../../' }
          : {}
        : {},
    },
    {
      loader: require.resolve('css-loader'),
      options: cssOptions,
    },
    {
      // Options for PostCSS as we reference these options twice
      // Adds vendor prefixing based on your specified browser support in
      // package.json
      loader: require.resolve('postcss-loader'),
      options: {
        postcssOptions: {
          plugins: [
            require('postcss-flexbugs-fixes'),
            require('postcss-preset-env')({
              autoprefixer: {
                flexbox: 'no-2009',
              },
              stage: 3,
            }),
            // Adds PostCSS Normalize as the reset css with default options,
            // so that it honors browserslist config in package.json
            // which in turn let's users customize the target behavior as per their needs.
            postcssNormalize(),
          ],
        },
        sourceMap: isEnvProduction ? shouldUseSourceMap : isEnvDevelopment,
        implementation: require('postcss'),
      },
    },
  ].filter(Boolean) as RuleSetUseItem[];
  if (preProcessor) {
    loaders.push(
      {
        loader: require.resolve('resolve-url-loader'),
        options: {
          sourceMap: isEnvProduction ? shouldUseSourceMap : isEnvDevelopment,
          root: paths.appSrc,
        } as any,
      },
      {
        loader: preProcessor,
        options: {
          sourceMap: true,
        } as any,
      },
    );
  }

  return loaders;
}
