import { defineConfig } from 'cypress';

export default defineConfig({
  chromeWebSecurity: false,
  defaultCommandTimeout: 40000,
  includeShadowDom: true,
  responseTimeout: 40000,
  redirectionLimit: 100,
  experimentalStudio: true,
  experimentalMemoryManagement: true,
  // See here: https://github.com/cypress-io/cypress/issues/21307. experimentalModifyObstructiveThirdPartyCode is necessary to prevent microsoft from removing test frame.
  experimentalModifyObstructiveThirdPartyCode: true,
  numTestsKeptInMemory: 0,
  viewportHeight: 1080,
  viewportWidth: 1920,
  video: true,
  reporter: 'mochawesome',
  reporterOptions: {
    files: ['./mochawesome-report/*.json'],
    overwrite: false,
    html: true,
    json: true,
  },
  e2e: {
    baseUrl: 'https://bcgov.github.io/sso-requests-sandbox',
    projectId: 'gctfmh',
    setupNodeEvents(on, config) {
      on('before:browser:launch', (browser, launchOptions) => {
        if (browser.family === 'chromium' && (browser.name === 'chrome' || browser.name === 'chromium')) {
          // If the browser is Chrome or Chromium, add the flags to expose the `gc` function and disable GPU
          launchOptions.args.push('--js-flags=--expose-gc');
          launchOptions.args.push('--disable-gpu');
        }
        return launchOptions;
      });
    },
  },
});
