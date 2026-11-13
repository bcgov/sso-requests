import { defineConfig, devices } from '@playwright/test';
import { ci } from './support/env';
import { live } from './support/live';

const isCI = !!process.env.CI;

export default defineConfig({
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  forbidOnly: isCI,
  // One retry in CI so a flake is reported as "flaky" rather than failing the build silently; locally fail fast.
  retries: isCI ? 1 : 0,
  workers: isCI ? 2 : undefined,
  reporter: isCI ? [['github'], ['list'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    viewport: { width: 1440, height: 1000 },
  },

  projects: [
    // --- CI tier: docker-compose stack, local keycloak login, no external IdPs or secrets ---
    {
      name: 'ci-setup',
      testDir: 'tests/ci',
      testMatch: /auth\.setup\.ts/,
      use: { baseURL: ci.appUrl, ...chromiumLocal() },
    },
    {
      name: 'ci',
      testDir: 'tests/ci',
      testIgnore: /auth\.setup\.ts/,
      dependencies: ['ci-setup'],
      use: { baseURL: ci.appUrl, ...chromiumLocal() },
    },

    // --- Live tier: sandbox with real IdPs (Azure IDIR + MFA, BCeID, GitHub, ...). Scheduled only. ---
    {
      name: 'live-setup',
      testDir: 'tests/live',
      testMatch: /auth\.setup\.ts/,
      use: liveUse(),
    },
    {
      name: 'live',
      testDir: 'tests/live',
      testIgnore: /auth\.setup\.ts/,
      dependencies: ['live-setup'],
      // Live tests share real accounts and IdP sessions, so run them one at a time (also pass --workers=1).
      fullyParallel: false,
      use: liveUse(),
    },
  ],
});

/**
 * The local keycloak is addressed as dev-keycloak.localtest.me so the browser and the app container agree on the token
 * issuer. *.localtest.me resolves to 127.0.0.1 via public DNS; pinning it here avoids depending on that (and on routers
 * that block DNS rebinding).
 */
function chromiumLocal() {
  return {
    ...devices['Desktop Chrome'],
    viewport: { width: 1440, height: 1000 },
    launchOptions: { args: ['--host-resolver-rules=MAP dev-keycloak.localtest.me 127.0.0.1'] },
  };
}

/**
 * Traces and videos record what's typed into login forms (fill() arguments are stored in plain text), so with real
 * credentials they stay off. The HTML report and test-results aren't safe either: on failure Playwright writes an
 * error-context.md page snapshot that includes the values of filled inputs (password fields too). CI therefore
 * uploads only the failure screenshots, which show password fields masked.
 */
function liveUse() {
  return {
    ...devices['Desktop Chrome'],
    viewport: { width: 1440, height: 1000 },
    baseURL: live.appUrl,
    trace: 'off' as const,
    video: 'off' as const,
    screenshot: 'only-on-failure' as const,
  };
}
