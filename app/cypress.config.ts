import { defineConfig } from 'cypress';
import { generate } from 'otplib';
import { createGuardrails } from '@otplib/core';

const TOTP_PERIOD_SECONDS = 30;
const TOTP_MIN_REMAINING_SECONDS = 5;
const otpGuardrails = createGuardrails({ MIN_SECRET_BYTES: 8 });

export default defineConfig({
  chromeWebSecurity: false,
  defaultCommandTimeout: 80000,
  includeShadowDom: true,
  responseTimeout: 80000,
  redirectionLimit: 100,
  // See here: https://github.com/cypress-io/cypress/issues/21307. experimentalModifyObstructiveThirdPartyCode is necessary to prevent microsoft from removing test frame.
  experimentalModifyObstructiveThirdPartyCode: true,
  numTestsKeptInMemory: 0,
  viewportHeight: 1080,
  pageLoadTimeout: 120000,
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
    baseUrl: 'https://sso-requests-sandbox.apps.gold.devops.gov.bc.ca/',
    projectId: 'gctfmh',
    experimentalModifyObstructiveThirdPartyCode: true,
    setupNodeEvents(on, config) {
      config.expose = {
        ...config.expose,
        host: config.env.host ?? config.baseUrl,
        localtest: config.env.localtest ?? false,
        smoketest: config.env.smoketest ?? false,
      };
      on('task', {
        log(message: string) {
          console.log(message);
          return null;
        },
        // Generated at the moment the code is typed so it can't expire during a slow login flow.
        // If the current TOTP window is about to roll over, wait for the next one.
        async generateOTP(secret: string) {
          const elapsed = (Date.now() / 1000) % TOTP_PERIOD_SECONDS;
          const remaining = TOTP_PERIOD_SECONDS - elapsed;
          if (remaining < TOTP_MIN_REMAINING_SECONDS) {
            await new Promise((resolve) => setTimeout(resolve, remaining * 1000 + 250));
          }
          return generate({ secret, guardrails: otpGuardrails });
        },
      });
      on('before:browser:launch', (browser, launchOptions) => {
        if (browser.family === 'chromium' && (browser.name === 'chrome' || browser.name === 'chromium')) {
          // If the browser is Chrome or Chromium, add the flags to expose the `gc` function and disable GPU
          launchOptions.args.push('--js-flags=--expose-gc');
          launchOptions.args.push('--disable-gpu');
        }
        return launchOptions;
      });
      return config;
    },
  },
});
