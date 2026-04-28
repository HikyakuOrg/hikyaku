import { test, expect } from "@playwright/test";

// Add Vehicle flow
// TODO: This test is failing. For some reason, the values are not being set in the form after VIN decode, even though the server action is returning the correct data. Need to investigate further.
// Auto-population of Make, Model, Year fields works when testing manually. 

test.describe("Fleet Vehicles Add Flow", () => {
    test("Valid and invalid VIN autofill", async ({ page }) => {
        test.setTimeout(120000);

        // Navigate to Add Vehicle page directly (assuming user is already authenticated via storageState)
        await page.goto("/dashboard/fleet/vehicles/add");

        // Should navigate to /dashboard/fleet/vehicles/add
        await expect(page).toHaveURL("/dashboard/fleet/vehicles/add");

        const vinInput = page.getByLabel(/vin/i);

        // Valid VIN test
        await vinInput.pressSequentially("1G6DG5EY8B0199944");
        // Make, Model, Year should be autofilled (wait for server action to complete)
        await expect(page.locator("#make")).toHaveValue("Cadillac", { timeout: 30000 });
        await expect(page.locator("#model")).toHaveValue("CTS", { timeout: 10000 });
        await expect(page.locator("#year")).toHaveValue("2011", { timeout: 10000 });

        
        await page.reload();

        // Invalid VIN test
        await vinInput.pressSequentially("JTNAB0AEX0A002410", { delay: 30 });
        // Make, Model, Year should NOT be autofilled
        await expect(page.locator("#make")).not.toHaveValue("Cadillac", { timeout: 90000 });
        await expect(page.locator("#model")).not.toHaveValue("CTS", { timeout: 90000 });
        await expect(page.locator("#year")).not.toHaveValue("2011", { timeout: 90000 });
    });
});
