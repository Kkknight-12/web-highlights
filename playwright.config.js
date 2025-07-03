import { defineConfig, devices } from '@playwright/test';
import path from 'path';

export default defineConfig({
  testDir: './e2e-tests',
  timeout: 30000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  
  use: {
    trace: 'on-first-retry',
    video: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium-extension',
      use: {
        ...devices['Desktop Chrome'],
        // Load the extension
        launchOptions: {
          args: [
            `--disable-extensions-except=${path.resolve('./dist')}`,
            `--load-extension=${path.resolve('./dist')}`,
            '--no-sandbox'
          ],
          headless: false // Extensions don't work in headless mode
        },
      },
    },
  ],

  // Run build before tests
  webServer: {
    command: 'npm run build',
    port: null,
    reuseExistingServer: !process.env.CI,
  },
});