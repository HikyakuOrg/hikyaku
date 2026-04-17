import { defineConfig, devices } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

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

loadDotEnvFile(".env.local");

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const authCookieName = process.env.PLAYWRIGHT_SB_AUTH_COOKIE_NAME ?? "FAKE_AUTH_COOKIE_NAME";
const authCookieValue = process.env.PLAYWRIGHT_SB_AUTH_COOKIE;
const cookieDomain = new URL(baseURL).hostname;
const cookieSecure = new URL(baseURL).protocol === "https:";

const storageState = authCookieValue
    ? {
        cookies: [
            {
                name: authCookieName,
                value: authCookieValue,
                domain: cookieDomain,
                path: "/",
                expires: -1,
                httpOnly: false,
                secure: cookieSecure,
                sameSite: "Lax" as const,
            },
        ],
        origins: [],
    }
    : undefined;

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
        storageState,
    },
    webServer: {
        command: "pnpm dev",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
    },
    projects: [
        {
            name: "chrome",
            use: {
                ...devices["Desktop Chrome"],
                channel: "chrome",
            },
        },
    ],
});
