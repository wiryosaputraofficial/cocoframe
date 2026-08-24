import { defineConfig, devices } from "@playwright/test";

const developmentBaseUrl = "http://127.0.0.1:3210";
const productionBaseUrl = "http://127.0.0.1:3211";

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: ".cocoframe/playwright-results",
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: false,
  // WebKit's Windows process can terminate or stall under cross-browser contention.
  workers: process.env.CI || process.platform === "win32" ? 1 : 2,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [
        ["line"],
        ["html", { outputFolder: ".cocoframe/playwright-report", open: "never" }],
      ]
    : "line",
  use: {
    reducedMotion: "reduce",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  webServer: [
    {
      command: "node packages/cli/src/main.ts dev examples/basic",
      url: developmentBaseUrl,
      env: {
        ...process.env,
        HOST: "127.0.0.1",
        PORT: "3210",
      },
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: "node scripts/e2e-production-server.mjs",
      url: productionBaseUrl,
      env: {
        ...process.env,
        HOST: "127.0.0.1",
        PORT: "3211",
      },
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
  projects: [
    {
      name: "development-chromium",
      testMatch: "**/development.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: developmentBaseUrl,
      },
    },
    {
      name: "production-chromium",
      testMatch: "**/runtime.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: productionBaseUrl,
      },
    },
    {
      name: "production-firefox",
      testMatch: "**/runtime.spec.ts",
      use: {
        ...devices["Desktop Firefox"],
        baseURL: productionBaseUrl,
      },
    },
    {
      name: "production-webkit",
      testMatch: "**/runtime.spec.ts",
      use: {
        ...devices["Desktop Safari"],
        baseURL: productionBaseUrl,
      },
    },
    ...[
      ["viewport-320", 320, 568],
      ["phone-6-inch", 390, 844],
      ["tablet", 768, 1024],
      ["laptop", 1366, 768],
      ["4k", 3840, 2160],
    ].map(([name, width, height]) => ({
      name: String(name),
      testMatch: "**/responsive.spec.ts",
      use: {
        baseURL: productionBaseUrl,
        browserName: "chromium" as const,
        viewport: { width: Number(width), height: Number(height) },
      },
    })),
  ],
});
