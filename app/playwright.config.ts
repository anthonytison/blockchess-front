import { defineConfig, devices } from '@playwright/test';

// Polyfill for Node.js compatibility
if (typeof globalThis.TransformStream === 'undefined') {
  try {
    const { TransformStream } = require('stream/web');
    globalThis.TransformStream = TransformStream;
  } catch (e) {
    // Fallback for older Node.js versions
    console.warn('TransformStream polyfill not available');
  }
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3050',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  webServer: {
    command: 'pnpm run build && pnpm run start',
    url: 'http://localhost:3050',
    reuseExistingServer: !process.env.CI,
  },
});