import { defineConfig, devices } from "@playwright/test";
import { join } from "node:path";
import { existsSync, readFileSync } from "node:fs";

function loadDotEnvFile(fileName: string): void {
    const filePath = join(process.cwd(), fileName);
    if (!existsSync(filePath)) {
        return;
    }
    const content = readFileSync(filePath, "utf8");
    for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) {
            continue;
        }
        const separator = trimmed.indexOf("=");
        if (separator <= 0) {
            continue;
        }
        const key = trimmed.slice(0, separator).trim();
        const value = trimmed.slice(separator + 1);
        if (!process.env[key]) {
            process.env[key] = value;
        }
    }
}

loadDotEnvFile(".env.test");

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
    testDir: "./tests/e2e",
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: "html",
    use: {
        baseURL,
        trace: "on-first-retry",
        storageState: "playwright.storageState.json",
    },
    webServer: {
        command: "pnpm dev",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
    },
    globalSetup: require.resolve("./playwright.global-setup.ts"),
    projects: [
        {
            name: "chrome",
            testIgnore: /(auth-|org-cross-user-).*\.spec\.ts/,
            use: {
                ...devices["Desktop Chrome"],
                channel: "chrome",
            },
        },
        {
            name: "chrome-unauthed",
            testMatch: /(auth-|org-cross-user-).*\.spec\.ts/,
            use: {
                ...devices["Desktop Chrome"],
                channel: "chrome",
                storageState: undefined,
            },
        },
    ],
});