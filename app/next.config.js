const path = require('path');
const APP_ENV = process.env.NEXT_PUBLIC_APP_ENV || 'development';
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
      '@sso/logs-query': '../packages/logs-query/src/index.ts',
    },
  },
  output: 'standalone',
  outputFileTracingIncludes: {
    '/*': ['node_modules/pg-format/**/*'],
  },
  async headers() {
    return APP_ENV === 'production'
      ? [
          {
            source: '/(.*)',
            headers: [
              {
                key: 'Content-Security-Policy',
                value:
                  "default-src 'self';base-uri 'self';block-all-mixed-content;font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests",
              },
              {
                key: 'X-Frame-Options',
                value: 'DENY',
              },

              {
                key: 'Referrer-Policy',
                value: 'no-referrer',
              },
              {
                key: 'Permissions-Policy',
                value:
                  'accelerometer=(), ambient-light-sensor=(), autoplay=(), battery=(), camera=(), cross-origin-isolated=(), display-capture=(), document-domain=(), encrypted-media=(), execution-while-not-rendered=(), execution-while-out-of-viewport=(), fullscreen=(), geolocation=(), gyroscope=(), keyboard-map=(), magnetometer=(), microphone=(), midi=(), navigation-override=(), payment=(), picture-in-picture=(), publickey-credentials-get=(), screen-wake-lock=(), sync-xhr=(), usb=(), web-share=(), xr-spatial-tracking=()',
              },
              {
                key: 'X-XSS-Protection',
                value: '1; mode=block',
              },
              {
                key: 'Cache-Control',
                value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
              },
              {
                key: 'Pragma',
                value: 'no-cache',
              },
              {
                key: 'Expires',
                value: '0',
              },
              {
                key: 'Surrogate-Control',
                value: 'no-store',
              },
              {
                key: 'Strict-Transport-Security',
                value: 'max-age=63072000; includeSubDomains; preload',
              },
              {
                key: 'X-Content-Type-Options',
                value: 'nosniff',
              },
            ],
          },
        ]
      : [];
  },
};
