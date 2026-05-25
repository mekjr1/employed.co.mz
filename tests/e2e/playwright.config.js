// @ts-check
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: '.',
  timeout: 60000,
  workers: 1,
  retries: 0,
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3300',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'off',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
  ],
  reporter: [['list'], ['json', { outputFile: 'e2e-results.json' }]],
});
