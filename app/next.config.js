const path = require('path');
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || '';
const BASE_PATH = process.env.APP_BASE_PATH || '';

module.exports = {
  reactStrictMode: true,
  // @sso/authz is compiled from source at ../packages/authz, outside this
  // directory. Webpack refuses to build files outside the project root without
  // this; the turbopack block below is the equivalent for the default builder.
  experimental: {
    externalDir: true,
  },
  assetPrefix: APP_URL,
  // basePath has to start with a /
  // basePath has to be either an empty string or a path prefix
  basePath: BASE_PATH,
  turbopack: {
    // Required, not a tidy-up: with an import reaching outside this directory
    // and no explicit root, the build does not terminate.
    root: path.resolve(__dirname, '..'),
    resolveAlias: {
      'pg-native': path.resolve(__dirname, './empty.ts'),
      'cloudflare:sockets': path.resolve(__dirname, './empty.ts'),
      // Relative to this directory, and naming the entry file rather than the
      // directory: Turbopack resolves a relative alias against the importer's
      // project directory and does no index resolution for it.
      '@sso/authz': '../packages/authz/src/index.ts',
    },
  },
  output: 'standalone',
  outputFileTracingIncludes: {
    '/*': ['node_modules/pg-format/**/*'],
  },
};
