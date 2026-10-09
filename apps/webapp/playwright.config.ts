import { defineConfig, devices } from '@playwright/test';

/**
 * Misst den Kalender im echten Browser. Läuft nicht in `npm run check`.
 * Artefakte (Screenshots, Traces) bleiben lokal und gehören nicht ins Git.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  reporter: 'line',
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], channel: 'chrome' } }],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5173 --strictPort',
    url: 'http://127.0.0.1:5173/dev/datum',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
