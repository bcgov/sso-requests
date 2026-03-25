const path = require('path');
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || '';
const BASE_PATH = process.env.APP_BASE_PATH || '';

module.exports = {
  reactStrictMode: true,
  assetPrefix: APP_URL,
  // basePath has to start with a /
  // basePath has to be either an empty string or a path prefix
  basePath: BASE_PATH,
  turbopack: {
    resolveAlias: {
      'pg-native': path.resolve(__dirname, './empty.ts'),
      'cloudflare:sockets': path.resolve(__dirname, './empty.ts'),
    },
  },
  output: 'standalone',
  outputFileTracingIncludes: {
    '/*': ['node_modules/pg-format/**/*'],
  },
};
