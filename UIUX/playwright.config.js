import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';

const installedBrowser = process.env.UIUX_CHROME_PATH || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find(existsSync);

export default defineConfig({
  testDir: './tests/browser',
  workers: 1,
  timeout: 45000,
  use: {
    baseURL: 'http://127.0.0.1:5173',
    headless: true,
    launchOptions: installedBrowser ? { executablePath: installedBrowser } : {},
    screenshot: 'only-on-failure',
  },
  reporter: 'list',
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
