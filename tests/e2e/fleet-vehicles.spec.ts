import { test, expect } from "@playwright/test";
import { d } from "./helpers/org-url";

/** A VIN the decoder resolves to a real make/model/year/type, used across specs in this file. */
const VALID_VIN = "1G6DG5EY8B0199944";

test.describe("Fleet Vehicles Add Flow", () => {
    test("Valid and invalid VIN autofill", async ({ page }) => {
        test.setTimeout(120000);

        // Navigate to Add Vehicle page directly (assuming user is already authenticated via storageState)
        await page.goto(d('/fleet/vehicles/add'));

        // Should navigate to /dashboard/fleet/vehicles/add
        await expect(page).toHaveURL(d('/fleet/vehicles/add'));

        const vinInput = page.getByLabel(/vin/i);

        // Valid VIN test
        await vinInput.pressSequentially(VALID_VIN);
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

test.describe("Fleet Vehicles Skills", () => {
    test("creates a skill inline from the Capabilities picker and it persists on the vehicle", async ({ page }) => {
        test.setTimeout(120000);
        // Needs an existing warehouse to complete the form — not guaranteed in CI.
        test.skip(!!process.env.CI, "Requires a seeded warehouse — skipped in CI");

        await page.goto(d('/fleet/vehicles/add'));

        // Valid VIN autofills make/model/year/type, so only plate, warehouse and
        // skills are left to fill in.
        await page.getByLabel(/vin/i).pressSequentially(VALID_VIN);
        await expect(page.locator("#make")).toHaveValue("Cadillac", { timeout: 30000 });

        const plate = `SKL-${Date.now()}`;
        await page.getByLabel(/registration plate/i).fill(plate);

        await page.getByText("Select warehouse").click();
        await expect(page.getByRole("option").first()).toBeVisible({ timeout: 10000 });
        await page.getByRole("option").first().click();

        const skillName = `E2E Skill ${Date.now()}`;
        const skillsPicker = page.getByTestId("vehicle-skills-picker");
        await skillsPicker.click();
        await skillsPicker.locator("input").fill(skillName);
        const createButton = page.getByTestId("vehicle-skills-picker-create");
        await expect(createButton).toBeVisible({ timeout: 10000 });
        await createButton.click();
        await expect(createButton).toHaveCount(0, { timeout: 15000 });
        await expect(skillsPicker.getByText(skillName)).toBeVisible({ timeout: 15000 });
        // Close the picker's popup so it cannot overlay the submit button below.
        await page.keyboard.press("Escape");

        // This VIN decodes with no GVWR, so gross limits autofills to 0 — which
        // fails the form's `positive()` check and silently blocks submission.
        await page.locator("#gross").fill("1500");

        const [vehicleInsertResponse] = await Promise.all([
            page.waitForResponse((res) => res.url().includes("/rest/v1/vehicles") && res.request().method() === "POST"),
            page.getByRole("button", { name: /save vehicle/i }).click(),
        ]);
        const createdVehicle = await vehicleInsertResponse.json();

        await expect(page).toHaveURL(d('/fleet/vehicles'), { timeout: 20000 });

        // Reopen the vehicle's edit form directly and confirm the skill assignment
        // survived the round trip through `setVehicleSkills`.
        await page.goto(d(`/fleet/vehicles/${createdVehicle.id}/edit`));
        await expect(page.getByTestId("vehicle-skills-picker").getByText(skillName)).toBeVisible({ timeout: 15000 });
    });
});
