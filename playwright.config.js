// @ts-check
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:8090',
    viewport: { width: 1280, height: 800 },
  },
  projects: [
    { name: 'chromium', testIgnore: /mobile\.spec\.js/, use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
    // Phone with touch: layout, header and accessibility checks
    { name: 'mobile', testMatch: /(header|mobile|a11y)\.spec\.js/, use: { ...devices['Pixel 7'] } },
  ],
  // Serve the pages without caching on a separate port, so `npm start` can keep running
  webServer: {
    command: 'npx http-server -p 8090 -c-1 -s',
    url: 'http://localhost:8090/index.html',
    reuseExistingServer: !process.env.CI,
  },
});
