import createCache from '@emotion/cache';

// react-select styles itself with Emotion, which injects <style> tags at runtime. The CSP set in proxy.ts
// only allows nonce'd styles, so the cache must stamp them with the per-request nonce. Browsers hide the
// nonce attribute from getAttribute, but the `nonce` property on the nonce'd <script> tags is still readable.
const getNonce = () => {
  if (typeof document === 'undefined') return undefined;
  return document.querySelector<HTMLScriptElement>('script[nonce]')?.nonce || undefined;
};

export const createEmotionCache = () => createCache({ key: 'css', nonce: getNonce() });
