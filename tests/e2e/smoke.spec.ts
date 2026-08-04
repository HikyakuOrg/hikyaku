import { expect, test } from "@playwright/test";

test("root redirects an authenticated user into their dashboard", async ({ page }) => {
    // The app host (app.<root>) has no marketing pages; "/" hands off to /orgs,
    // which resolves the user's org and lands on the dashboard.
    const response = await page.goto("/");
    expect(response?.ok()).toBeTruthy();
    await expect(page).toHaveURL(/\/orgs\/[^/]+\/dashboard/, { timeout: 15_000 });
});
``