import { defineConfig, devices } from '@playwright/test'

// The keys come from .env in this folder (copy .env.example). Keep .env out of git and out of chat.
try {
  process.loadEnvFile('.env')
} catch {
  // No .env: fall back to the shell's environment.
}

for (const name of ['CLERK_PUBLISHABLE_KEY', 'CLERK_SECRET_KEY', 'ZERODROP_API_KEY']) {
  if (!process.env[name]) throw new Error(`${name} is missing: set it in .env (see .env.example)`)
}

const PORT = 3123

export default defineConfig({
  testDir: 'e2e',
  timeout: 90_000,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    // Clerk's Playwright setup: fetches a testing token once, before the tests.
    { name: 'setup', testMatch: /global\.setup\.ts/ },
    {
      name: 'chromium',
      testMatch: /.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
  ],
  webServer: {
    command: 'node server.mjs',
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
  },
})
