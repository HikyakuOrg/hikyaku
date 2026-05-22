import { expect, test } from "@playwright/test";
import { d } from "./helpers/org-url";

// pnpm test:e2e -- tests/e2e/dashboard-settings-mobile.spec.ts
test.describe("Dashboard Settings Mobile", () => {
    test("displays the QR code and captures a screenshot", async ({ page }, testInfo) => {
        const response = await page.goto(d('/settings/mobile'));

        expect(response?.ok()).toBeTruthy();
        await expect(page).toHaveURL(d('/settings/mobile'));

        await expect(
            page.getByRole("heading", { name: "Scan the QR code in WhenDan app", level: 1 })
        ).toBeVisible();

        await page.waitForFunction(() => {
            const canvas = document.querySelector('[data-testid="mobile-qr-wrapper"] canvas') as HTMLCanvasElement | null;
            if (!canvas) return false;

            const ctx = canvas.getContext('2d');
            if (!ctx) return false;

            const pixel = ctx.getImageData(0, 0, 1, 1).data;
            return pixel.some(value => value !== 0);
        });

        const qrWrapper = page.getByTestId("mobile-qr-wrapper");
        await expect(qrWrapper).toBeVisible();

        await page.screenshot({
            path: testInfo.outputPath("dashboard-settings-mobile.png"),
            fullPage: true,
        });
    });
});
