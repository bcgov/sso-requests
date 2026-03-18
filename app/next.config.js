import { resolve } from 'path';

export const reactStrictMode = true;
export const assetPrefix = process.env.NEXT_PUBLIC_APP_URL || '';
export const basePath = process.env.APP_BASE_PATH || '';
export const turbopack = {
  resolveAlias: {
    'pg-native': resolve(__dirname, './empty.ts'),
    'cloudflare:sockets': resolve(__dirname, './empty.ts'),
  },
  root: resolve(__dirname, '..'),
};
