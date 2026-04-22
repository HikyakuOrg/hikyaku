import { expect, test } from "@playwright/test";

test.describe("Dashboard Settings Mobile", () => {
    test("displays the QR code and captures a screenshot", async ({ page }, testInfo) => {
        const response = await page.goto("/dashboard/settings/mobile");

        expect(response?.ok()).toBeTruthy();
        await expect(page).toHaveURL("/dashboard/settings/mobile");

        await expect(
            page.getByRole("heading", { name: "Scan the QR code in WhenDan app", level: 1 })
        ).toBeVisible();

        const qrWrapper = page.getByTestId("mobile-qr-wrapper");
        await expect(qrWrapper).toBeVisible();
        await expect(qrWrapper.locator("canvas")).toBeVisible();

        await page.screenshot({
            path: testInfo.outputPath("dashboard-settings-mobile.png"),
            fullPage: true,
        });
    });
});
