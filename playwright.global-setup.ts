import { chromium, expect, type FullConfig } from "@playwright/test";
import { join } from "node:path";
import { existsSync, readFileSync } from "node:fs";

function loadDotEnvFile(fileName: string): void {
    const filePath = join(process.cwd(), fileName);
    if (!existsSync(filePath)) return;

    const content = readFileSync(filePath, "utf8");
    for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const separator = trimmed.indexOf("=");
        if (separator <= 0) continue;
        const key = trimmed.slice(0, separator).trim();
        const value = trimmed.slice(separator + 1);
        if (!process.env[key]) process.env[key] = value;
    }
}

function getSupabaseAuthCookieName(): string {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
        throw new Error("NEXT_PUBLIC_SUPABASE_URL is required for Playwright auth setup.");
    }

    const projectRefMatch = supabaseUrl.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/i);
    if (!projectRefMatch) {
        throw new Error("Could not extract Supabase project ref from NEXT_PUBLIC_SUPABASE_URL.");
    }

    return `sb-${projectRefMatch[1]}-auth-token`;
}

async function globalSetup(_config: FullConfig) {
    loadDotEnvFile(".env.test");
    const authCookieName = getSupabaseAuthCookieName();

    const browser = await chromium.launch();
    const context = await browser.newContext({
        baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    });
    const page = await context.newPage();

    await page.goto("/auth/login");
    await page.getByRole("button", { name: "Email & password" }).click();
    await page.getByLabel("Email").fill(process.env.PLAYWRIGHT_EMAIL!);
    await page.getByLabel("Password").fill(process.env.PLAYWRIGHT_PASSWORD!);
    await page.getByRole("button", { name: "Login" }).click();

    await expect
        .poll(async () => {
            const cookies = await context.cookies();
            return cookies.some((cookie) => cookie.name === authCookieName && cookie.value.length > 0);
        })
        .toBeTruthy();

    await context.storageState({ path: "playwright.storageState.json" });

    const authenticatedPage = await context.newPage();
    await authenticatedPage.goto("/orgs");
    await expect(authenticatedPage).toHaveURL(/\/orgs\/[^/]+\/dashboard/, { timeout: 15_000 });
    const resolvedUrl = authenticatedPage.url();
    const slugMatch = resolvedUrl.match(/\/orgs\/([^/]+)\/dashboard/);
    if (slugMatch?.[1]) {
        process.env.PLAYWRIGHT_ORG_SLUG = slugMatch[1];
    }
    await authenticatedPage.close();

    await context.close();
    await browser.close();
}

export default globalSetup;