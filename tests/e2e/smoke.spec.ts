import { expect, test } from "@playwright/test";

test("homepage loads in Chrome", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.ok()).toBeTruthy();
    await expect(page).toHaveTitle(/WhenDan/i);
});
